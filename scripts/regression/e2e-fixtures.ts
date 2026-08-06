/**
 * Garante (sem duplicar se já existir) os cenários no banco local que os testes
 * de UI (iescolaFront2024/e2e) precisam e que não dá pra montar só na hora, porque
 * dependem de estado que normalmente só existe depois de uso real do sistema:
 *
 *   - shared:        uma questão vinculada a 2+ provas (pra testar a trava de
 *                     compartilhamento no formulário).
 *   - multiSkill:     uma questão com 2+ habilidades (pra testar o sufixo "+N").
 *   - testClassroom:  uma prova ATIVA de categoria SIM_ITA/AVL_ITA com uma sala
 *                     sem nenhum aluno de matrícula encerrada (pra escrever numa
 *                     célula da grade sem esbarrar em regra de negócio).
 *   - readingFluency: idem, categoria READ_2/READ_3.
 *
 * Primeiro procura algo assim já existente no banco (não força nada à toa). Só cria
 * estado novo se genuinamente não achar nenhum caso real. Nada aqui é apagado no
 * final — ao contrário das fixtures do script de regressão de API, isto é estado de
 * apoio pros testes de UI rodarem tantas vezes quanto precisar, igual ao que fizemos
 * manualmente com a questão 1543 nesta sessão.
 *
 * testClassroom/readingFluency merecem nota à parte: como IDs de prova têm prazo
 * (test.endedAt) e um job diário desativa (test.active=0) o que já venceu, um teste
 * de UI que hardcoda um ID específico expira sozinho conforme o relógio do banco
 * local avança — foi o que aconteceu com os IDs 240 e 211 que este arquivo usava
 * antes (achado em 06/08/2026, ver commit que introduziu findOrActivateGridTest).
 * Por isso a escolha é sempre dinâmica; se não achar nenhuma prova ativa que sirva
 * (aconteceu com READ_2/READ_3: as 10 provas da categoria estavam todas inativas),
 * reativa a melhor candidata — mesma filosofia de "estado de apoio persistente".
 *
 * Uso: npx ts-node scripts/regression/e2e-fixtures.ts
 * Imprime uma linha de JSON: { shared: {...}, multiSkill: {...}, testClassroom: {...}, readingFluency: {...} }
 */
import 'dotenv/config';
import { connectionPool } from '../../src/services/db';
import { TEST_CATEGORIES_IDS as tcids } from '../../src/utils/enums';

async function db(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await connectionPool.query(sql, params);
  return rows as any[];
}

type SharedFixture = { testId: number; questionId: number; testQuestionId: number; questionTitle: string; created: boolean };
type MultiSkillFixture = {
  testId: number; questionId: number; testQuestionId: number; questionTitle: string;
  firstReference: string; skillCount: number; created: boolean;
  // uma 2ª prova da mesma disciplina que AINDA NÃO tem essa questão — é onde o
  // teste de UI abre o picker "ADICIONAR" pra ver a coluna Habilidade com o "+N"
  // (a questão não aparece no picker da prova onde ela já está incluída).
  pickerTestId: number;
};
type GridTestFixture = { testId: number; classroomId: number; reactivated: boolean };

async function questionTitleOf(questionId: number): Promise<string> {
  const [q] = await db(`SELECT title FROM question WHERE id = ?`, [questionId]);
  return q.title;
}

// Quantas questões da MESMA prova têm este título — usado tanto aqui quanto em
// findOrCreateMultiSkillQuestion para o mesmo motivo: o teste de UI localiza a
// linha pelo texto do título (getByRole('row', { name: título })), então um
// título repetido dentro da prova aberta faz o locator bater em mais de uma
// linha ("strict mode violation"). Não basta o título ser único no banco todo —
// só interessa a colisão dentro da prova que o teste vai abrir.
async function titleCollisionsInTest(testId: number, title: string): Promise<number> {
  const [{ n }] = await db(
    `SELECT COUNT(*) AS n FROM test_question tq JOIN question q ON q.id = tq.questionId WHERE tq.testId = ? AND q.title = ?`,
    [testId, title]
  );
  return n;
}

async function findOrCreateSharedQuestion(): Promise<SharedFixture> {
  // Achado em 06/08/2026: a 1ª questão compartilhada que o banco local tinha
  // (questionId=1, título "pergunta") tinha 2 outras questões com o MESMO título
  // na mesma prova (seed antigo, 3 questões "pergunta" na prova 1) — o locator do
  // teste de UI batia nas 3. Por isso, como em findOrCreateMultiSkillQuestion,
  // percorre os candidatos até achar um cujo título não colida na própria prova.
  const candidates = await db(
    `SELECT questionId, COUNT(DISTINCT testId) AS n FROM test_question GROUP BY questionId HAVING n >= 2`
  );
  for (const { questionId } of candidates) {
    const [tq] = await db(`SELECT testId, id FROM test_question WHERE questionId = ? ORDER BY testId LIMIT 1`, [questionId]);
    const title = await questionTitleOf(questionId);
    if ((await titleCollisionsInTest(tq.testId, title)) !== 1) continue;
    return { testId: tq.testId, questionId, testQuestionId: tq.id, questionTitle: title, created: false };
  }

  // nenhum candidato compartilhado com título sem colisão na própria prova — força
  // o cenário: acha um test_question cujo título não colida na própria prova e
  // duplica o vínculo da questão numa segunda prova (mesma técnica usada
  // manualmente nesta sessão com a questão 1543).
  const forceCandidates = await db(
    `SELECT tq.id, tq.testId, tq.questionId, tq.questionGroupId, q.title
     FROM test_question tq JOIN question q ON q.id = tq.questionId ORDER BY tq.id`
  );
  let anyTq: any = null;
  for (const cand of forceCandidates) {
    if ((await titleCollisionsInTest(cand.testId, cand.title)) === 1) { anyTq = cand; break; }
  }
  if (!anyTq) throw new Error('Banco local sem nenhum test_question cujo título não colida com outra questão da mesma prova.');

  const [otherTest] = await db(`SELECT id FROM test WHERE id != ? ORDER BY id LIMIT 1`, [anyTq.testId]);
  if (!otherTest) throw new Error('Banco local só tem uma prova — precisa de pelo menos duas pra simular compartilhamento.');

  const [res]: any = await connectionPool.query(
    `INSERT INTO test_question (\`order\`, answer, active, testId, questionId, questionGroupId, createdAt)
     VALUES (99, 'A', 1, ?, ?, ?, NOW())`,
    [otherTest.id, anyTq.questionId, anyTq.questionGroupId]
  );
  void res;

  return { testId: anyTq.testId, questionId: anyTq.questionId, testQuestionId: anyTq.id, questionTitle: anyTq.title, created: true };
}

// prova da mesma disciplina que ainda não tem essa questão — pra ela aparecer no
// picker "ADICIONAR" (que filtra fora questões já presentes na prova aberta).
async function findPickerTestId(questionId: number, disciplineId: number): Promise<number> {
  const [row] = await db(
    `SELECT id FROM test WHERE disciplineId = ? AND active = 1 AND id NOT IN (
       SELECT testId FROM test_question WHERE questionId = ?
     ) ORDER BY id DESC LIMIT 1`,
    [disciplineId, questionId]
  );
  if (!row) throw new Error(`Não achei uma 2ª prova da disciplina ${disciplineId} sem a questão ${questionId} pra testar o picker.`);
  return row.id;
}

async function findOrCreateMultiSkillQuestion(): Promise<MultiSkillFixture> {
  // O teste de UI localiza a linha desta questão no picker "ADICIONAR" pelo texto
  // do título — títulos NÃO são únicos neste banco (várias questões reaproveitam o
  // código da habilidade como título, ex: 16 questões com title='EF15LP03'). Por
  // isso só aceita um candidato existente cujo título seja único; senão força um novo.
  const candidates = await db(
    `SELECT qs.questionId AS questionId, COUNT(*) AS n FROM question_skill qs GROUP BY qs.questionId HAVING n >= 2`
  );
  for (const { questionId } of candidates) {
    const [{ n: titleCount }] = await db(
      `SELECT COUNT(*) AS n FROM question WHERE title = (SELECT title FROM question WHERE id = ?)`,
      [questionId]
    );
    if (titleCount !== 1) continue;

    const [tq] = await db(`SELECT testId, id FROM test_question WHERE questionId = ? LIMIT 1`, [questionId]);
    if (!tq) continue; // questão com 2+ habilidades mas sem nenhuma prova — não serve pro cenário do picker
    const [q] = await db(`SELECT disciplineId FROM question WHERE id = ?`, [questionId]);
    const refs = await db(
      `SELECT s.reference FROM question_skill qs JOIN skill s ON qs.skillId = s.id WHERE qs.questionId = ? ORDER BY s.reference`,
      [questionId]
    );
    return {
      testId: tq.testId, questionId, testQuestionId: tq.id, questionTitle: await questionTitleOf(questionId),
      firstReference: refs[0].reference, skillCount: refs.length, created: false,
      pickerTestId: await findPickerTestId(questionId, q.disciplineId),
    };
  }

  // nenhuma questão com 2+ habilidades E título único — força uma questão nova
  // (título com timestamp, garantidamente único) numa prova já existente. Precisa
  // ser uma prova ATIVA (senão a tela nem carrega o formulário de edição) — prefere
  // a mesma categoria da prova 240 (AVALIAÇÃO ITATIBA, já sabidamente compatível
  // com a tela de edição), mas aceita qualquer prova ativa se não achar uma.
  const [anyTq] = await db(
    `SELECT tq.testId, tq.questionGroupId, q.personId, q.disciplineId, q.classroomCategoryId
     FROM test_question tq
     JOIN question q ON tq.questionId = q.id
     JOIN test t ON t.id = tq.testId
     WHERE t.active = 1
     ORDER BY (t.categoryId = (SELECT categoryId FROM test WHERE id = 240)) DESC, tq.id DESC
     LIMIT 1`
  );
  if (!anyTq) throw new Error('Banco local sem nenhuma questão vinculada a uma prova ativa.');

  const skillCandidates = await db(
    `SELECT id, reference FROM skill WHERE disciplineId = ? AND classroomCategoryId = ? ORDER BY reference LIMIT 2`,
    [anyTq.disciplineId, anyTq.classroomCategoryId]
  );
  if (skillCandidates.length < 2) throw new Error('Não achei 2 habilidades disponíveis nessa disciplina/categoria pra forçar o cenário.');
  const [a, b] = skillCandidates;

  const title = `ZQA_E2E_MULTISKILL_${Date.now()}`;
  const [qRes]: any = await connectionPool.query(
    `INSERT INTO question (title, active, personId, disciplineId, classroomCategoryId, skillId, createdAt)
     VALUES (?, 1, ?, ?, ?, ?, NOW())`,
    [title, anyTq.personId, anyTq.disciplineId, anyTq.classroomCategoryId, a.id]
  );
  const questionId = qRes.insertId;

  await connectionPool.query(
    `INSERT INTO question_skill (questionId, skillId, createdAt) VALUES (?, ?, NOW()), (?, ?, NOW())`,
    [questionId, a.id, questionId, b.id]
  );

  const [tqRes]: any = await connectionPool.query(
    `INSERT INTO test_question (\`order\`, answer, active, testId, questionId, questionGroupId, createdAt)
     VALUES (99, 'A', 1, ?, ?, ?, NOW())`,
    [anyTq.testId, questionId, anyTq.questionGroupId]
  );

  const allRefs = [a.reference, b.reference].sort((x, y) => x.localeCompare(y));

  return {
    testId: anyTq.testId, questionId, testQuestionId: tqRes.insertId, questionTitle: title,
    firstReference: allRefs[0], skillCount: 2, created: true,
    pickerTestId: await findPickerTestId(questionId, anyTq.disciplineId),
  };
}

// Acha uma prova das categorias dadas com uma sala "limpa" pro teste de UI escrever
// numa célula sem esbarrar em regra de negócio. O teste sempre mexe na 1ª linha da
// grade (data-grid-row="0" / id="0-..."), e não temos como saber de fora qual é
// exatamente essa 1ª linha, então a forma segura de garantir que ela é editável é
// garantir que TODAS são:
//   - matrícula não pode ter terminado (student_classroom.endedAt) pra nenhum aluno
//     da sala, no ano do período da prova;
//   - student_test_status.active não pode estar 0 pra nenhum aluno — é o campo que
//     trava a célula em [readOnly]="!sC.studentStatus.active" (test-classroom.
//     component.html); achado em 06/08/2026 testando o candidato óbvio (245/27):
//     20 de 23 alunos travados, herdado de estado antigo, sem forma de destravar
//     pela UI (mesmo achado documentado em FRONTEND-2.1-MAPEAMENTO.md §5).
//
// Prioriza uma prova já ATIVA. Se não achar nenhuma (aconteceu com READ_2/READ_3:
// as 10 provas da categoria estavam todas com o prazo vencido), reativa a com o
// prazo mais recente — mesmo espírito das outras fixtures deste arquivo: nunca
// apaga nada, só garante estado de apoio que persiste entre execuções.
//
// requireQuestions: categorias como AVL_ITA usam test_question (blocos de questão)
// pra montar a grade — sem isso não tem coluna pra clicar. READ_2/READ_3 não usam
// test_question (o cabeçalho vem de um catálogo fixo de exame/nível), por isso o
// chamador passa false ali.
async function findOrActivateGridTest(categoryIds: number[], requireQuestions: boolean): Promise<GridTestFixture> {
  const placeholders = categoryIds.map(() => '?').join(',');

  const cleanCandidateQuery = `
    SELECT t.id AS testId, tc.classroomId, t.endedAt
    FROM test t
    JOIN test_classroom tc ON tc.testId = t.id
    JOIN period p ON p.id = t.periodId
    WHERE t.categoryId IN (${placeholders})
      AND (SELECT COUNT(*) FROM student_classroom sc WHERE sc.classroomId = tc.classroomId AND sc.yearId = p.yearId) > 0
      AND NOT EXISTS (
        SELECT 1 FROM student_classroom sc2
        WHERE sc2.classroomId = tc.classroomId AND sc2.yearId = p.yearId AND sc2.endedAt IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM student_test_status sts
        JOIN student_classroom sc3 ON sc3.id = sts.studentClassroomId
        WHERE sts.testId = t.id AND sc3.classroomId = tc.classroomId AND sts.active = 0
      )
      ${requireQuestions ? 'AND EXISTS (SELECT 1 FROM test_question tq2 WHERE tq2.testId = t.id)' : ''}
  `;

  const active = await db(`${cleanCandidateQuery} AND t.active = 1 ORDER BY t.id LIMIT 1`, categoryIds);
  if (active.length) return { testId: active[0].testId, classroomId: active[0].classroomId, reactivated: false };

  const candidate = await db(`${cleanCandidateQuery} ORDER BY t.endedAt DESC LIMIT 1`, categoryIds);
  if (!candidate.length) {
    throw new Error(`Nenhuma prova das categorias [${categoryIds.join(',')}] tem uma sala sem matrícula encerrada nem célula travada.`);
  }

  const { testId, classroomId } = candidate[0];
  await connectionPool.query(`UPDATE test SET active = 1, endedAt = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE id = ?`, [testId]);
  return { testId, classroomId, reactivated: true };
}

async function main() {
  const shared = await findOrCreateSharedQuestion();
  const multiSkill = await findOrCreateMultiSkillQuestion();
  // Só AVL_ITA, não SIM_ITA: em SIMULADO active=0 é o estado NORMAL de "prova
  // entregue" (trava anti-reenvio), não uma anomalia — misturar as duas categorias
  // faria o filtro "sem célula travada" rejeitar toda sala com aluno que já
  // respondeu, que é o caso comum. Ver FRONTEND-2.1-MAPEAMENTO.md §5.
  const testClassroom = await findOrActivateGridTest([tcids.AVL_ITA], true);
  const readingFluency = await findOrActivateGridTest([tcids.READ_2, tcids.READ_3], false);
  process.stdout.write(JSON.stringify({ shared, multiSkill, testClassroom, readingFluency }));
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => connectionPool.end());
