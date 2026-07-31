/**
 * Regressão de API + banco para a migração question<->skill (N:N).
 * Roda contra o servidor local (`npm run dev`) e o banco local — não é unitário,
 * não mocka nada. Cria sua própria prova/questões sintéticas (prefixo ZQA_),
 * exercita updateTest via chamada HTTP real, confere o banco, e apaga tudo no final.
 *
 * Uso: npx ts-node scripts/regression/question-skill.regression.ts
 * Pré-requisito: `npm run dev` rodando (servidor local respondendo em SERVER_PORT).
 *
 * Cobre o "Protocolo de teste" da skill question-skill-nn (itens 1, 2, 4, 6, 7-9, 12)
 * que dá pra automatizar sem navegador. Os itens que só se confirmam visualmente
 * (3, 5, 7 trava no modal, 10 imagens reais, 11, 13) continuam no roteiro manual —
 * ver PARTE 2 (Playwright) para os que dá pra automatizar via UI.
 */
import 'dotenv/config';
import { connectionPool } from '../../src/services/db';
import { mintAdminToken } from './lib/auth';

const BASE_URL = `http://localhost:${process.env.SERVER_PORT || 5000}`;
const RUN_TAG = `ZQA_${Date.now()}`;

// ---------------------------------------------------------------------------
// Infra mínima: fetch autenticado, DB helper, contador de passa/falha.
// ---------------------------------------------------------------------------

type ApiResult = { status: number; body: any };

async function api(method: string, path: string, token: string | null, body?: any): Promise<ApiResult> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* corpo vazio, ok */ }
  return { status: res.status, body: json };
}

async function db(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await connectionPool.query(sql, params);
  return rows as any[];
}

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`  PASS  ${label}`);
  } else {
    failCount++;
    failures.push(`${label}${detail ? ` :: ${detail}` : ''}`);
    console.log(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
// Setup: token de admin + contexto (discipline/person/category/period/group)
// reaproveitados de uma prova real já existente no banco local, e limpeza de
// sobras de uma execução anterior que tenha sido interrompida antes do teardown.
// ---------------------------------------------------------------------------

async function loadContext() {
  let rows = await db(`SELECT personId, disciplineId, categoryId, periodId FROM test WHERE id = 240 LIMIT 1`);
  if (!rows.length) rows = await db(`SELECT personId, disciplineId, categoryId, periodId FROM test ORDER BY id LIMIT 1`);
  if (!rows.length) throw new Error('Nenhuma prova existente no banco local pra derivar contexto (person/discipline/category/period).');
  const { personId, disciplineId, categoryId, periodId } = rows[0];

  const groupRows = await db(`SELECT id FROM question_group ORDER BY id LIMIT 1`);
  if (!groupRows.length) throw new Error('Nenhum question_group no banco local.');

  const catRows = await db(
    `SELECT classroomCategoryId FROM question WHERE disciplineId = ? AND classroomCategoryId IS NOT NULL LIMIT 1`,
    [disciplineId]
  );
  if (!catRows.length) throw new Error('Não achei classroomCategoryId em uso pra essa disciplina.');

  const skillRows = await db(
    `SELECT id, reference FROM skill WHERE disciplineId = ? AND classroomCategoryId = ? ORDER BY reference LIMIT 6`,
    [disciplineId, catRows[0].classroomCategoryId]
  );
  if (skillRows.length < 5) throw new Error('Menos de 5 habilidades disponíveis nesse contexto — precisa de mais pra rodar os cenários.');

  return {
    personId, disciplineId, categoryId, periodId,
    questionGroupId: groupRows[0].id,
    classroomCategoryId: catRows[0].classroomCategoryId,
    skills: skillRows as { id: number; reference: string }[],
  };
}

// apaga sobras de execuções anteriores que tenham morrido antes do teardown
async function sweepOrphans() {
  const orphanTests = await db(`SELECT id FROM test WHERE name LIKE 'ZQA\\_%'`);
  const orphanQuestions = await db(`SELECT id FROM question WHERE title LIKE 'ZQA\\_%'`);
  const testIds = orphanTests.map(r => r.id);
  const questionIds = orphanQuestions.map(r => r.id);

  if (questionIds.length) await db(`DELETE FROM question_image WHERE questionId IN (?)`, [questionIds]);
  if (questionIds.length) await db(`DELETE FROM question_skill WHERE questionId IN (?)`, [questionIds]);
  if (testIds.length || questionIds.length) {
    if (testIds.length) await db(`DELETE FROM test_question WHERE testId IN (?)`, [testIds]);
    if (questionIds.length) await db(`DELETE FROM test_question WHERE questionId IN (?)`, [questionIds]);
  }
  if (questionIds.length) await db(`DELETE FROM question WHERE id IN (?)`, [questionIds]);
  if (testIds.length) await db(`DELETE FROM test WHERE id IN (?)`, [testIds]);

  if (testIds.length || questionIds.length) {
    console.log(`(limpeza) sobras de execução anterior removidas: ${testIds.length} prova(s), ${questionIds.length} questão(ões)`);
  }
}

// ---------------------------------------------------------------------------
// Fixtures: uma prova (Test A) com 5 questões sintéticas, uma segunda prova
// (Test B) só pra forçar o compartilhamento da questão TQ3.
// ---------------------------------------------------------------------------

type Fixture = {
  testAId: number; testBId: number;
  questionIds: { legacy: number; addSkill: number; shared: number; malformed: number; images: number };
  testQuestionIds: { legacy: number; addSkill: number; shared: number; malformed: number; images: number };
  imageId: number;
  sharedInitialSkillId: number;
};

async function setupFixtures(ctx: Awaited<ReturnType<typeof loadContext>>): Promise<Fixture> {
  const [testA]: any = await connectionPool.query(
    `INSERT INTO test (name, active, hideAnswers, personId, disciplineId, categoryId, periodId, createdAt)
     VALUES (?, 1, 0, ?, ?, ?, ?, NOW())`,
    [`${RUN_TAG}_TESTE_A`, ctx.personId, ctx.disciplineId, ctx.categoryId, ctx.periodId]
  );
  const [testB]: any = await connectionPool.query(
    `INSERT INTO test (name, active, hideAnswers, personId, disciplineId, categoryId, periodId, createdAt)
     VALUES (?, 1, 0, ?, ?, ?, ?, NOW())`,
    [`${RUN_TAG}_TESTE_B`, ctx.personId, ctx.disciplineId, ctx.categoryId, ctx.periodId]
  );
  const testAId = testA.insertId;
  const testBId = testB.insertId;

  async function insertQuestion(title: string, skillId: number | null) {
    const [res]: any = await connectionPool.query(
      `INSERT INTO question (title, active, personId, disciplineId, classroomCategoryId, skillId, createdAt)
       VALUES (?, 1, ?, ?, ?, ?, NOW())`,
      [title, ctx.personId, ctx.disciplineId, ctx.classroomCategoryId, skillId]
    );
    return res.insertId as number;
  }

  async function insertTestQuestion(testId: number, questionId: number, order: number) {
    const [res]: any = await connectionPool.query(
      `INSERT INTO test_question (\`order\`, answer, active, testId, questionId, questionGroupId, createdAt)
       VALUES (?, 'A', 1, ?, ?, ?, NOW())`,
      [order, testId, questionId, ctx.questionGroupId]
    );
    return res.insertId as number;
  }

  const sharedInitialSkillId = ctx.skills[0].id;

  const legacyQId = await insertQuestion(`${RUN_TAG}_LEGACY`, null);
  const addSkillQId = await insertQuestion(`${RUN_TAG}_ADD_SKILL`, null);
  const sharedQId = await insertQuestion(`${RUN_TAG}_SHARED`, sharedInitialSkillId);
  const malformedQId = await insertQuestion(`${RUN_TAG}_MALFORMED`, null);
  const imagesQId = await insertQuestion(`${RUN_TAG}_IMAGES`, null);

  await connectionPool.query(
    `INSERT INTO question_skill (questionId, skillId, createdAt) VALUES (?, ?, NOW())`,
    [sharedQId, sharedInitialSkillId]
  );

  const legacyTqId = await insertTestQuestion(testAId, legacyQId, 1);
  const addSkillTqId = await insertTestQuestion(testAId, addSkillQId, 2);
  const sharedTqId = await insertTestQuestion(testAId, sharedQId, 3);
  const malformedTqId = await insertTestQuestion(testAId, malformedQId, 4);
  const imagesTqId = await insertTestQuestion(testAId, imagesQId, 5);

  // segunda ligação da questão "shared" — é isso que gera inUse >= 1 quando vista pela prova A
  await insertTestQuestion(testBId, sharedQId, 1);

  const [imgRes]: any = await connectionPool.query(
    `INSERT INTO question_image (type, \`order\`, s3Key, active, questionId, createdAt)
     VALUES ('main', 1, ?, 1, ?, NOW())`,
    [`questions/${RUN_TAG}_fake.png`, imagesQId]
  );

  return {
    testAId, testBId,
    questionIds: { legacy: legacyQId, addSkill: addSkillQId, shared: sharedQId, malformed: malformedQId, images: imagesQId },
    testQuestionIds: { legacy: legacyTqId, addSkill: addSkillTqId, shared: sharedTqId, malformed: malformedTqId, images: imagesTqId },
    imageId: imgRes.insertId,
    sharedInitialSkillId,
  };
}

async function teardown(fx: Fixture) {
  const questionIds = Object.values(fx.questionIds);
  await db(`DELETE FROM question_image WHERE questionId IN (?)`, [questionIds]);
  await db(`DELETE FROM question_skill WHERE questionId IN (?)`, [questionIds]);
  await db(`DELETE FROM test_question WHERE testId IN (?)`, [[fx.testAId, fx.testBId]]);
  await db(`DELETE FROM question WHERE id IN (?)`, [questionIds]);
  await db(`DELETE FROM test WHERE id IN (?)`, [[fx.testAId, fx.testBId]]);
  console.log(`\n(limpeza) fixtures removidas: provas ${fx.testAId}/${fx.testBId}, questões ${questionIds.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Helpers de snapshot/asserção
// ---------------------------------------------------------------------------

async function snapshotQuestion(id: number) {
  const [q] = await db(`SELECT id, skillId, updatedAt FROM question WHERE id = ?`, [id]);
  const skills = await db(`SELECT skillId FROM question_skill WHERE questionId = ? ORDER BY skillId`, [id]);
  return { updatedAt: q?.updatedAt ?? null, skillId: q?.skillId ?? null, skillIds: skills.map(s => s.skillId) };
}

async function snapshotTestQuestion(id: number) {
  const [tq] = await db(`SELECT id, \`order\`, answer, active, updatedAt FROM test_question WHERE id = ?`, [id]);
  return { order: tq?.order, answer: tq?.answer, active: tq?.active, updatedAt: tq?.updatedAt ?? null };
}

function sameSkillSet(a: number[], b: number[]) {
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

// clona o testQuestion como veio do GET (já no shape que o backend produz)
function cloneTq(tq: any): any {
  return JSON.parse(JSON.stringify(tq));
}

// GET devolve question.skills como Array<{id,reference,description}> (formato de leitura).
// A API de escrita espera number[] (formato decidido na Fase 3 — ver skill
// question-skill-nn). Pra reenviar uma questão "sem alteração" de habilidades,
// precisa converter — igual ao que standardizeTestQuestion() faz no front real.
function toWireTq(tq: any): any {
  const clone = cloneTq(tq);
  if (Array.isArray(clone.question.skills)) {
    clone.question.skills = clone.question.skills.map((s: any) => (typeof s === 'number' ? s : s.id));
  }
  return clone;
}

// ---------------------------------------------------------------------------
// Cenários
// ---------------------------------------------------------------------------

async function run() {
  console.log(`Regressão question<->skill — ${new Date().toISOString()}`);
  console.log(`Servidor: ${BASE_URL} | tag desta execução: ${RUN_TAG}`);

  await sweepOrphans();

  const token = await mintAdminToken();
  const ctx = await loadContext();
  const fx = await setupFixtures(ctx);
  console.log(`Fixtures criadas: prova A=${fx.testAId}, prova B=${fx.testBId}, questões=${JSON.stringify(fx.questionIds)}`);

  try {
    // Estado inicial de todas as questões, pra comparar "intocado" ao longo dos cenários
    const before = {
      legacy: await snapshotQuestion(fx.questionIds.legacy),
      addSkill: await snapshotQuestion(fx.questionIds.addSkill),
      shared: await snapshotQuestion(fx.questionIds.shared),
      malformed: await snapshotQuestion(fx.questionIds.malformed),
      images: await snapshotQuestion(fx.questionIds.images),
    };

    // ---------------------------------------------------------------
    section('1/6 — Retrocompatibilidade (payload sem skills) + regressão diffsStrict');
    // ---------------------------------------------------------------
    {
      const getRes = await api('GET', `/test/${fx.testAId}`, token);
      check('GET /test/:id retorna 200 pra buscar o estado atual', getRes.status === 200, JSON.stringify(getRes.body));

      const testQuestions = getRes.body.data.testQuestions.map((tq: any) => {
        const clone = cloneTq(tq);
        delete clone.question.skills; // simula frontend antigo: sem o campo novo
        return clone;
      });

      const putRes = await api('PUT', `/test/${fx.testAId}`, token, {
        name: getRes.body.data.name, active: getRes.body.data.active, hideAnswers: getRes.body.data.hideAnswers,
        testQuestions,
      });
      check('PUT sem alterações retorna 200', putRes.status === 200, JSON.stringify(putRes.body));

      for (const key of Object.keys(fx.questionIds) as (keyof typeof fx.questionIds)[]) {
        const after = await snapshotQuestion(fx.questionIds[key]);
        const b = (before as any)[key];
        check(`[${key}] question.updatedAt não avançou`, after.updatedAt === b.updatedAt, `antes=${b.updatedAt} depois=${after.updatedAt}`);
        check(`[${key}] question.skillId inalterado`, after.skillId === b.skillId, `antes=${b.skillId} depois=${after.skillId}`);
        check(`[${key}] question_skill inalterada`, sameSkillSet(after.skillIds, b.skillIds), `antes=${b.skillIds} depois=${after.skillIds}`);
      }

      const tqAfter = await snapshotTestQuestion(fx.testQuestionIds.legacy);
      check('test_question.updatedAt não avançou (diffsStrict não disparou)', tqAfter.updatedAt === null, `updatedAt=${tqAfter.updatedAt}`);
    }

    // ---------------------------------------------------------------
    section('2/6 — Adicionar habilidades a questão não compartilhada');
    // ---------------------------------------------------------------
    {
      const [skillA, skillB] = ctx.skills.filter(s => s.id !== fx.sharedInitialSkillId).slice(0, 2);
      const expectedFirst = [skillA, skillB].sort((a, b) => a.reference.localeCompare(b.reference))[0].id;

      const getRes = await api('GET', `/test/${fx.testAId}`, token);
      const testQuestions = getRes.body.data.testQuestions.map((tq: any) => toWireTq(tq));
      const target = testQuestions.find((tq: any) => tq.question.id === fx.questionIds.addSkill);
      target.question.skills = [skillA.id, skillB.id];

      const putRes = await api('PUT', `/test/${fx.testAId}`, token, {
        name: getRes.body.data.name, active: getRes.body.data.active, hideAnswers: getRes.body.data.hideAnswers,
        testQuestions,
      });
      check('PUT adicionando habilidades retorna 200', putRes.status === 200, JSON.stringify(putRes.body));

      const after = await snapshotQuestion(fx.questionIds.addSkill);
      check('question_skill ganhou as 2 linhas esperadas', sameSkillSet(after.skillIds, [skillA.id, skillB.id]), `skills=${after.skillIds}`);
      check(`question.skillId virou a 1ª em ordem alfabética (${expectedFirst})`, after.skillId === expectedFirst, `skillId=${after.skillId}`);
      check('question.updatedAt avançou (skillId mudou de NULL pra um valor)', after.updatedAt !== before.addSkill.updatedAt);

      for (const key of ['legacy', 'shared', 'malformed', 'images'] as const) {
        const siblingAfter = await snapshotQuestion(fx.questionIds[key]);
        const b = (before as any)[key];
        check(`[irmã ${key}] intocada por essa alteração`, siblingAfter.updatedAt === b.updatedAt && sameSkillSet(siblingAfter.skillIds, b.skillIds));
      }

      before.addSkill = after; // snapshot atualizado pra próximos cenários
    }

    // ---------------------------------------------------------------
    section('3/6 — Trava de questão compartilhada');
    // ---------------------------------------------------------------
    {
      const [otherA, otherB] = ctx.skills.slice(2, 4);
      const getRes = await api('GET', `/test/${fx.testAId}`, token);
      const sharedTq = getRes.body.data.testQuestions.find((tq: any) => tq.question.id === fx.questionIds.shared);
      check('questão "shared" aparece com inUse >= 1 nesta prova', (sharedTq.question.inUse ?? 0) >= 1, `inUse=${sharedTq.question.inUse}`);

      const testQuestions = getRes.body.data.testQuestions.map((tq: any) => toWireTq(tq));
      const target = testQuestions.find((tq: any) => tq.question.id === fx.questionIds.shared);
      target.question.skills = [otherA.id, otherB.id]; // tentativa de troca — deve ser ignorada

      const putRes = await api('PUT', `/test/${fx.testAId}`, token, {
        name: getRes.body.data.name, active: getRes.body.data.active, hideAnswers: getRes.body.data.hideAnswers,
        testQuestions,
      });
      check('PUT retorna 200 (backend ignora silenciosamente, não recusa a prova inteira)', putRes.status === 200, JSON.stringify(putRes.body));

      const after = await snapshotQuestion(fx.questionIds.shared);
      check('question_skill NÃO mudou (continua só a habilidade original)', sameSkillSet(after.skillIds, [fx.sharedInitialSkillId]), `skills=${after.skillIds}`);
      check('question.skillId NÃO mudou', after.skillId === fx.sharedInitialSkillId, `skillId=${after.skillId}`);
      check('question.updatedAt NÃO avançou', after.updatedAt === before.shared.updatedAt);

      const warnings = putRes.body?.warnings ?? [];
      check('resposta inclui warnings com 1 item', Array.isArray(warnings) && warnings.length === 1, JSON.stringify(putRes.body?.warnings));
      const warning = warnings[0] ?? {};
      check('warning aponta a questão certa', warning.questionId === fx.questionIds.shared, `questionId=${warning.questionId}`);
      check('warning tem mensagem explicando o motivo', typeof warning.message === 'string' && warning.message.length > 0, warning.message);

      // sem tentativa real de mudança (manda de volta o que já está gravado) -> sem warning
      const getRes2 = await api('GET', `/test/${fx.testAId}`, token);
      const testQuestions2 = getRes2.body.data.testQuestions.map((tq: any) => toWireTq(tq));
      const putRes2 = await api('PUT', `/test/${fx.testAId}`, token, {
        name: getRes2.body.data.name, active: getRes2.body.data.active, hideAnswers: getRes2.body.data.hideAnswers,
        testQuestions: testQuestions2,
      });
      check('PUT sem tentativa real de mudança retorna 200', putRes2.status === 200, JSON.stringify(putRes2.body));
      check('PUT sem tentativa real de mudança NÃO inclui warnings', putRes2.body?.warnings === undefined, JSON.stringify(putRes2.body?.warnings));
    }

    // ---------------------------------------------------------------
    section('4/6 — Payload malformado (skills inválidos)');
    // ---------------------------------------------------------------
    {
      const getRes = await api('GET', `/test/${fx.testAId}`, token);
      const testUpdatedAtBefore = getRes.body.data.updatedAt;

      async function attemptBadSkills(badValue: any, expectedMessageFragment: string, label: string) {
        const testQuestions = getRes.body.data.testQuestions.map((tq: any) => toWireTq(tq));
        const target = testQuestions.find((tq: any) => tq.question.id === fx.questionIds.malformed);
        target.question.skills = badValue;

        const putRes = await api('PUT', `/test/${fx.testAId}`, token, {
          name: getRes.body.data.name, active: getRes.body.data.active, hideAnswers: getRes.body.data.hideAnswers,
          testQuestions,
        });
        check(`[${label}] retorna 400`, putRes.status === 400, JSON.stringify(putRes.body));
        check(`[${label}] mensagem menciona "${expectedMessageFragment}"`, (putRes.body?.message ?? '').includes(expectedMessageFragment), putRes.body?.message);
      }

      await attemptBadSkills(['abc'], 'ids inteiros', 'não-numérico');
      await attemptBadSkills([999999999], 'não existem', 'id inexistente');

      const after = await snapshotQuestion(fx.questionIds.malformed);
      check('question_skill continua vazia (nada foi gravado)', after.skillIds.length === 0, `skills=${after.skillIds}`);
      check('question.skillId continua NULL', after.skillId === null, `skillId=${after.skillId}`);

      const testAfterRes = await api('GET', `/test/${fx.testAId}`, token);
      check('test.updatedAt não avançou (rollback da transação inteira, não só da questão)', testAfterRes.body.data.updatedAt === testUpdatedAtBefore);
    }

    // ---------------------------------------------------------------
    section('5/6 — Rota genérica de questão bloqueada');
    // ---------------------------------------------------------------
    {
      const postRes = await api('POST', `/question`, token, { title: 'não deveria gravar' });
      check('POST /question retorna 405', postRes.status === 405, JSON.stringify(postRes.body));

      const putRes = await api('PUT', `/question/${fx.questionIds.legacy}`, token, { title: 'não deveria gravar' });
      check('PUT /question/:id retorna 405', putRes.status === 405, JSON.stringify(putRes.body));

      const after = await snapshotQuestion(fx.questionIds.legacy);
      check('questão não foi alterada pela tentativa bloqueada', after.updatedAt === before.legacy.updatedAt);
    }

    // ---------------------------------------------------------------
    section('6/6 — Regressão de imagens (sem imagesModified não mexe em question_image)');
    // ---------------------------------------------------------------
    {
      const [imgBefore] = await db(`SELECT id, s3Key, \`order\`, type FROM question_image WHERE questionId = ?`, [fx.questionIds.images]);
      check('fixture de imagem existe antes do teste', !!imgBefore);

      const getRes = await api('GET', `/test/${fx.testAId}`, token);
      // não inclui images/imagesModified — igual ao shape que o front manda quando o modal
      // de imagens nunca foi aberto pra essa questão nesta sessão
      const testQuestions = getRes.body.data.testQuestions.map((tq: any) => toWireTq(tq));

      const putRes = await api('PUT', `/test/${fx.testAId}`, token, {
        name: getRes.body.data.name, active: getRes.body.data.active, hideAnswers: getRes.body.data.hideAnswers,
        testQuestions,
      });
      check('PUT sem imagesModified retorna 200', putRes.status === 200, JSON.stringify(putRes.body));

      const [imgAfter] = await db(`SELECT id, s3Key, \`order\`, type FROM question_image WHERE questionId = ?`, [fx.questionIds.images]);
      check('question_image continua com a mesma linha (id, s3Key, order, type)',
        !!imgAfter && imgAfter.id === imgBefore.id && imgAfter.s3Key === imgBefore.s3Key &&
        imgAfter.order === imgBefore.order && imgAfter.type === imgBefore.type,
        `antes=${JSON.stringify(imgBefore)} depois=${JSON.stringify(imgAfter)}`);
    }

  } finally {
    await teardown(fx);
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`Resultado: ${passCount} passaram, ${failCount} falharam.`);
  if (failCount) {
    console.log('Falhas:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exitCode = failCount ? 1 : 0;
}

run()
  .catch(err => {
    console.error('\nERRO FATAL — script abortou antes de terminar:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await connectionPool.end();
  });
