import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { Request } from "express";
import { PER_CAT, TEST_CATEGORIES_IDS as tcids } from "../utils/enums";
import { EntityTarget } from "typeorm";
import { TestQuestionFull, JwtPayload, QuestionBlockJson } from "../interfaces/interfaces";
import { Helper } from "../utils/helpers";
import { deletarDoS3, moverParaQuestions } from "../services/s3.service";
import { QuestionImagePosition, QuestionImageType } from "../model/QuestionImage";
import { HttpError } from "../utils/helpers";
import { connectionPool } from "../services/db";
import { teacherRepository } from "../repositories/teacher.repository";
import { testRepository } from "../repositories/test.repository";
import { testQuestionService, PreparedNewQuestion, ReusedResolution, CurrOptionsView, OrderingPlan, ExistingOptionsPlan, ValidatedBlock } from "../services/test-question.service";
import { testAccessService } from "../services/test-access.service";

class TestUpdateController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async updateTest(id: number | string, req: Request<{ id: number | string }>, authUser: JwtPayload) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const uTeacher = await teacherRepository.qTeacherByUser(authUser.user)
      const userId = uTeacher.person.user.id
      const masterUser = uTeacher.person.category.id === PER_CAT.ADMN ||
        uTeacher.person.category.id === PER_CAT.SUPE ||
        uTeacher.person.category.id === PER_CAT.FORM;

      // Só id/personId/disciplineId: são os únicos campos de test.person/test.discipline
      // realmente usados abaixo (permissão e disciplina de questão nova) — dispensa JOIN.
      const [ testRows ] = await conn.query(`SELECT id, personId, disciplineId, categoryId FROM test WHERE id = ? LIMIT 1`, [Number(id)]);
      const test = (testRows as any[])[0];
      if (!test) throw new HttpError(404, "Teste não encontrado")
      if (testAccessService.isRestrictedCreator(authUser) && !testAccessService.isCategoryAllowedForRestricted(test.categoryId)) {
        throw new HttpError(403, 'Seu perfil só pode editar avaliações das categorias Simulado e Avaliação ITA.');
      }
      if (uTeacher.person.id !== test.personId && !masterUser) {
        throw new HttpError(403, "Você não tem permissão para editar esse teste.")
      }

      let endedAt: Date | undefined;
      if (req.body.endedAt && req.body.endedAt.length === 10) {
        endedAt = Helper.parseDDMMYYYYtoEndOfDayUTC(req.body.endedAt)
      }

      const updatedAt = new Date();

      const testSetClauses = ['name = ?', 'active = ?', 'hideAnswers = ?', 'updatedAt = ?', 'updatedByUser = ?'];
      const testSetParams: any[] = [req.body.name, req.body.active, req.body.hideAnswers, updatedAt, userId];
      if (endedAt !== undefined) { testSetClauses.push('endedAt = ?'); testSetParams.push(endedAt); }
      if (Number(test.categoryId) === tcids.SIM_ITA) {
        if (typeof req.body.has_token !== 'boolean') { throw new HttpError(400, "Valor inválido para o campo has_token.") }
        testSetClauses.push('is_token_required = ?'); testSetParams.push(Boolean(req.body.has_token));
      }
      testSetParams.push(test.id);
      await conn.query(`UPDATE test SET ${testSetClauses.join(', ')} WHERE id = ?`, testSetParams);

      // Sinaliza (sem virar erro) quando o front tentou alterar skills de uma
      // questão compartilhada e a trava isShared descartou a tentativa. Declarado
      // fora do "if" abaixo porque o bloco de retorno final também precisa dele.
      // Só entra no corpo da resposta quando não está vazio — ver retorno no final.
      const warnings: { questionId: number; message: string }[] = [];

      if (req.body.testQuestions?.length) {

        // Campos que existem só de um lado ou só servem de transporte.
        // Sem isso a comparação acusaria diferença em todo save.
        //   questionImages / inUse  -> só existem no objeto vindo do banco
        //   images / imagesModified -> só existem no payload do front
        //   skills                  -> vive em question_skill, não em question; sincronizada
        //                              à parte por comparação de conjuntos (ver abaixo). O
        //                              array do diffsStrict é posicional, então nem serviria
        //                              pra detectar mudança de skills corretamente.
        //   options                 -> vive em question_option, sincronizada à parte por label
        //   optionsOrder / correctLabel -> derivados e gravados explicitamente (nunca pelo diff):
        //                              o servidor calcula a resposta a partir do gabarito canônico
        const IGNORE = ['questionImages', 'inUse', 'images', 'imagesModified', 'skills', 'options', 'optionsOrder', 'correctLabel', 'blocks'];

        const bodyTq = req.body.testQuestions as any[]
        const dataTq: TestQuestionFull[] = await testQuestionService.getTestQuestions(test.id)

        // Pré-passada: toda validação de alternativas/posição roda antes de qualquer efeito no S3.
        const preparedNew = new Map<object, PreparedNewQuestion>();
        const optionPlans = new Map<object, ExistingOptionsPlan>();
        const reusedNew = new Map<object, ReusedResolution>();
        const orderingPlans = new Map<object, OrderingPlan>();
        const blockPlans = new Map<object, ValidatedBlock[]>();

        for (const next of bodyTq) {
          const curr = dataTq.find(el => el.id === next.id);

          if (!curr) {
            const prepared = testQuestionService.prepareNewQuestion(next);
            if (prepared) { preparedNew.set(next, prepared) }
            else if (next.question?.id) { reusedNew.set(next, await testQuestionService.resolveReusedQuestion(conn, Number(next.question.id), next)) }
            continue;
          }

          testQuestionService.sanitizeExistingQuestionTitle(curr, next);

          if (!testQuestionService.isSharedQuestion(curr)) {
            const blocks = testQuestionService.prepareBlocks(next.question?.blocks);
            if (blocks) { blockPlans.set(next, blocks) }
            if ((next.question as any)?.imagesModified === true) { testQuestionService.assertAddedImageKeys((next.question as any).images) }
          }

          const ordering = testQuestionService.resolveExistingOrdering(curr, next);
          if (ordering) { orderingPlans.set(next, ordering) }

          const plan = await testQuestionService.prepareExistingQuestionOptions(conn, curr, next);
          if (plan) { optionPlans.set(next, plan) }

          if (!testQuestionService.isSharedQuestion(curr) && next.question?.imagesModified === true) {
            testQuestionService.resolveImagePositions(next.question.images);
          }
        }

        for (let next of bodyTq) {
          const curr = dataTq.find(el => el.id === next.id);

          // ------------------------------------------------------------------
          // NOVA testQuestion (questão nova OU questão existente sendo vinculada)
          // ------------------------------------------------------------------
          if (!curr) {

            let questionToSave: any = next.question;

            if (!questionToSave.id) {
              // questão realmente nova: cria a Question e promove as imagens
              if (!questionToSave.classroomCategory?.id) {
                throw new HttpError(400, "Questão nova deve ter categoria definida")
              }

              // skills: number[] é a fonte de verdade. Formato antigo (question.skill: {id}, sem
              // skills — aba antiga do navegador) vira um único vínculo. question.skillId não é
              // mais gravada (Deploy 1 da Fase 5). Ver skill question-skill-nn.
              const validatedSkills = await testQuestionService.resolveNewQuestionSkills(conn, questionToSave);

              const preparedForInsert = preparedNew.get(next);
              const [ insertQuestionResult ]: any = await conn.query(
                `INSERT INTO question (title, personId, disciplineId, classroomCategoryId, correctLabel, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [questionToSave.title, questionToSave.person?.id || uTeacher.person.id, test.disciplineId, questionToSave.classroomCategory.id, preparedForInsert?.correctLabel ?? null, new Date(), userId]
              );
              const newQuestionId = insertQuestionResult.insertId;

              if (validatedSkills.length > 0) {
                const questionSkillValues = validatedSkills.map(s => [newQuestionId, s.id, new Date(), userId]);
                await conn.query(`INSERT INTO question_skill (questionId, skillId, createdAt, createdByUser) VALUES ?`, [questionSkillValues]);
              }

              const prepared = preparedNew.get(next);
              await testQuestionService.insertQuestionOptions(conn, newQuestionId, prepared?.options ?? [], updatedAt, userId);
              await testQuestionService.insertQuestionBlocks(conn, newQuestionId, prepared?.blocks ?? [], updatedAt, userId);

              // captura antes de sobrescrever questionToSave com o id novo
              const incomingImages = questionToSave.images;

              if (Array.isArray(incomingImages) && incomingImages.length > 0) {
                const questionImageValues = [];

                for (const [index, img] of incomingImages.entries()) {
                  const finalKey = await moverParaQuestions(img.s3Key);
                  questionImageValues.push([
                    img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT,
                    img.order,
                    prepared?.imagePositions[index] ?? QuestionImagePosition.BEFORE,
                    finalKey,
                    newQuestionId,
                    new Date(),
                    userId
                  ]);
                }

                await conn.query(`INSERT INTO question_image (type, \`order\`, position, s3Key, questionId, createdAt, createdByUser) VALUES ?`, [questionImageValues]);
              }

              questionToSave = { id: newQuestionId };
            }

            const reusedLink = reusedNew.get(next);
            const answerForLink = reusedLink ? reusedLink.answer : (preparedNew.get(next)?.correctLabel ?? next.answer);
            await conn.query(
              `INSERT INTO test_question (\`order\`, answer, questionGroupId, active, questionId, testId, optionsOrder, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [next.order, answerForLink, next.questionGroup.id, next.active, questionToSave.id, test.id, reusedLink?.optionsOrder ?? null, new Date(), userId]
            );

            continue;
          }

          // ------------------------------------------------------------------
          // testQuestion EXISTENTE
          // ------------------------------------------------------------------

          // inUse vem do getTestQuestions, já descontando a prova corrente.
          // É calculado no servidor — não confiamos em nada vindo do front.
          const isShared = testQuestionService.isSharedQuestion(curr);

          const orderingPlan = orderingPlans.get(next);
          if (orderingPlan) { next.answer = orderingPlan.answer; }

          if (testQuestionService.diffsStrict(curr, next, IGNORE)) {
            // questão compartilhada: só a referência, para não sobrescrever a Question original
            const questionIdForUpdate = isShared ? curr.question.id : next.question.id;

            await conn.query(
              `UPDATE test_question SET \`order\` = ?, answer = ?, questionGroupId = ?, active = ?, questionId = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
              [next.order, next.answer, next.questionGroup.id, next.active, questionIdForUpdate, updatedAt, userId, next.id]
            );
          }

          if (orderingPlan && orderingPlan.optionsOrder !== orderingPlan.previousOrder) {
            await conn.query(
              `UPDATE test_question SET optionsOrder = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
              [orderingPlan.optionsOrder, updatedAt, userId, curr.id]
            );
          }

          if (orderingPlan?.correctLabel && orderingPlan.correctLabel !== (curr.question as unknown as CurrOptionsView).correctLabel) {
            await conn.query(
              `UPDATE question SET correctLabel = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
              [orderingPlan.correctLabel, updatedAt, userId, curr.question.id]
            );
          }

          // skills: number[] (Fase 3) — presente e é a fonte de verdade quando o front já
          // migrou (Fase 4). Ausente/undefined -> nenhuma operação em question_skill.
          const nextSkills = (next.question as any).skills;
          const hasNewSkillsFormat = Array.isArray(nextSkills);

          // Título, categoria, pessoa e disciplina vivem em Question:
          // bloqueados quando a questão pertence também a outra prova.
          if (!isShared && testQuestionService.diffsStrict(curr.question, next.question, IGNORE)) {
            const questionSetClauses = ['title = ?', 'personId = ?', 'disciplineId = ?', 'classroomCategoryId = ?', 'updatedAt = ?', 'updatedByUser = ?'];
            const questionSetParams: any[] = [next.question.title, next.question.person.id, next.question.discipline.id, next.question.classroomCategory.id, updatedAt, userId];

            questionSetParams.push(curr.question.id);
            await conn.query(`UPDATE question SET ${questionSetClauses.join(', ')} WHERE id = ?`, questionSetParams);
          }

          // ------------------------------------------------------------------
          // Sincronização de question_skill (Fase 3) — comparação de conjuntos de
          // id, independente do diffsStrict (que é posicional e não serviria aqui).
          // skills: [] é estado legítimo (questão sem habilidade) e sincroniza
          // normalmente. Bloqueada por completo quando a questão é compartilhada —
          // mesma trava que já protegia título/categoria/skill único.
          // ------------------------------------------------------------------
          if (!isShared && hasNewSkillsFormat) {
            const validatedSkills = await testQuestionService.validateSkillIds(conn, nextSkills);

            const [ currSkillRows ] = await conn.query(`SELECT skillId FROM question_skill WHERE questionId = ?`, [curr.question.id]);
            const currIds = new Set((currSkillRows as any[]).map(r => r.skillId as number));
            const nextIds = new Set(validatedSkills.map(s => s.id));

            const toInsert = [...nextIds].filter(skillId => !currIds.has(skillId));
            const toDelete = [...currIds].filter(skillId => !nextIds.has(skillId));

            if (toInsert.length > 0) {
              const values = toInsert.map(skillId => [curr.question.id, skillId, updatedAt, userId]);
              await conn.query(`INSERT INTO question_skill (questionId, skillId, createdAt, createdByUser) VALUES ?`, [values]);
            }

            if (toDelete.length > 0) {
              await conn.query(`DELETE FROM question_skill WHERE questionId = ? AND skillId IN (?)`, [curr.question.id, toDelete]);
            }
          } else if (isShared && hasNewSkillsFormat) {
            // Mesma trava, só que aqui é pra AVISAR em vez de sincronizar. Não chama
            // validateSkillIds de propósito — hoje nenhuma validação de skills roda pra
            // questão compartilhada (o bloco de sincronização inteiro vive dentro de
            // !isShared), e não é este ajuste que deve começar a rejeitar com 400 um
            // payload malformado que de qualquer forma não seria escrito. Só compara
            // valores brutos pra decidir se havia uma tentativa real de mudança.
            const [ currSkillRows ] = await conn.query(`SELECT skillId FROM question_skill WHERE questionId = ?`, [curr.question.id]);
            const currIds = new Set((currSkillRows as any[]).map((r: any) => r.skillId as number));
            const nextIds = new Set((nextSkills as any[]).filter((v: any) => Number.isInteger(v)));

            const changed = currIds.size !== nextIds.size || [...nextIds].some(id => !currIds.has(id));
            if (changed) {
              warnings.push({ questionId: curr.question.id, message: 'Habilidades não alteradas: questão em uso em outra prova.' });
            }
          }

          const optionsPlan = optionPlans.get(next);
          if (optionsPlan) {
            if (isShared) {
              if (testQuestionService.optionsDiffer(next.question.options, optionsPlan.rows)) {
                warnings.push({ questionId: curr.question.id, message: 'Alternativas não alteradas: questão em uso em outra prova.' });
              }
            } else if (optionsPlan.rows.length === 0) {
              if (next.question.options.length > 0) {
                warnings.push({ questionId: curr.question.id, message: 'Alternativas não gravadas: questão no modelo antigo.' });
              }
            } else {
              await testQuestionService.syncQuestionOptions(conn, curr.question.id, optionsPlan, updatedAt, userId);
            }
          }

          const blocksPlan = blockPlans.get(next);
          if (blocksPlan && !isShared) {
            const currBlocks = ((curr.question as unknown as { blocks?: QuestionBlockJson[] }).blocks) ?? [];
            await testQuestionService.syncQuestionBlocks(conn, curr.question.id, currBlocks, blocksPlan, updatedAt, userId);
          }

          // questionGroup pertence ao contexto da prova: segue editável sempre.
          if (next.questionGroup && testQuestionService.diffsStrict(curr.questionGroup, next.questionGroup, IGNORE)) {
            await conn.query(
              `UPDATE question_group SET name = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
              [next.questionGroup.name, updatedAt, userId, next.questionGroup.id]
            );
          }

          // ----------------------------------------------------------------
          // Diff de imagens — duas condições cumulativas:
          //   !isShared      -> a questão não pertence também a outra prova
          //   imagesModified -> o admin abriu o modal e mexeu nas imagens
          // Sem o flag, um array vazio de questão apenas carregada seria lido
          // como "remover todas" e apagaria arquivos reais do S3.
          // ----------------------------------------------------------------
          const imagesModified = (next.question as any).imagesModified === true;
          const nextImages = (next.question as any).images;

          if (!isShared && imagesModified && Array.isArray(nextImages)) {

            const currImages = (curr.question as any).questionImages || [];
            const currById = new Map(currImages.map((img: any) => [img.id, img]));
            const nextIds = new Set(nextImages.filter((img: any) => img.id).map((img: any) => img.id));

            // 1. removidas: existiam no banco e não vieram mais no array
            for (const img of currImages as any[]) {
              if (!nextIds.has(img.id)) {
                // só apaga fisicamente arquivos do fluxo novo (questions/ ou tmp/);
                // legados na raiz perdem o vínculo mas permanecem no bucket
                if (testQuestionService.podeApagarDoS3(img.s3Key)) { await deletarDoS3(img.s3Key); }
                await conn.query(`DELETE FROM question_image WHERE id = ?`, [img.id]);
              }
            }

            // 2. novas ou substituídas
            for (const img of nextImages) {

              if (!img.id) {
                const finalKey = await moverParaQuestions(img.s3Key);
                await conn.query(
                  `INSERT INTO question_image (type, \`order\`, position, s3Key, questionId, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT, img.order, testQuestionService.resolveImagePosition(img.position), finalKey, curr.question.id, new Date(), userId]
                );
                continue;
              }

              const existing = currById.get(img.id) as any;
              if (!existing) continue; // id enviado não bate com nenhum registro atual

              // front antigo não envia position: manter a atual, nunca resetar 'after' para 'before'
              const nextPosition = img.position !== undefined ? testQuestionService.resolveImagePosition(img.position) : existing.position;

              // s3Key nova apontando para tmp/ -> substituição de arquivo
              if (img.s3Key !== existing.s3Key && String(img.s3Key).startsWith('tmp/')) {
                const finalKey = await moverParaQuestions(img.s3Key);
                const oldKey = existing.s3Key;

                await conn.query(
                  `UPDATE question_image SET s3Key = ?, \`order\` = ?, type = ?, position = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
                  [finalKey, img.order, img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT, nextPosition, updatedAt, userId, img.id]
                );

                if (testQuestionService.podeApagarDoS3(oldKey)) { await deletarDoS3(oldKey); }
                continue;
              }

              // só reordenação / troca de tipo, sem arquivo novo
              if (img.order !== existing.order || img.type !== existing.type || nextPosition !== existing.position) {
                await conn.query(
                  `UPDATE question_image SET \`order\` = ?, type = ?, position = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
                  [img.order, img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT, nextPosition, updatedAt, userId, img.id]
                );
              }
            }
          }
        }
      }

      await conn.commit();

      const result = await testRepository.qTestById(test.id);
      return warnings.length > 0
        ? { status: 200, data: result, warnings }
        : { status: 200, data: result };
    }
    catch (error: any) {
      if (conn) await conn.rollback();
      if (error instanceof HttpError) { return { status: error.status, message: error.message } }
      console.error(error);
      return { status: 500, message: error.message };
    }
    finally { if (conn) { conn.release() } }
  }
}

export const testUpdateController = new TestUpdateController();
