/**
 * Garante (sem duplicar se já existir) dois cenários no banco local que os testes
 * de UI (iescolaFront2024/e2e) precisam e que não dá pra montar só na hora, porque
 * dependem de estado que normalmente só existe depois de uso real do sistema:
 *
 *   - shared:    uma questão vinculada a 2+ provas (pra testar a trava de
 *                compartilhamento no formulário).
 *   - multiSkill: uma questão com 2+ habilidades (pra testar o sufixo "+N").
 *
 * Primeiro procura algo assim já existente no banco (não força nada à toa). Só cria
 * estado novo se genuinamente não achar nenhum caso real. Nada aqui é apagado no
 * final — ao contrário das fixtures do script de regressão de API, isto é estado de
 * apoio pros testes de UI rodarem tantas vezes quanto precisar, igual ao que fizemos
 * manualmente com a questão 1543 nesta sessão.
 *
 * Uso: npx ts-node scripts/regression/e2e-fixtures.ts
 * Imprime uma linha de JSON: { shared: {...}, multiSkill: {...} }
 */
import 'dotenv/config';
import { connectionPool } from '../../src/services/db';

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

async function questionTitleOf(questionId: number): Promise<string> {
  const [q] = await db(`SELECT title FROM question WHERE id = ?`, [questionId]);
  return q.title;
}

async function findOrCreateSharedQuestion(): Promise<SharedFixture> {
  const existing = await db(
    `SELECT questionId, COUNT(DISTINCT testId) AS n FROM test_question GROUP BY questionId HAVING n >= 2 LIMIT 1`
  );
  if (existing.length) {
    const { questionId } = existing[0];
    const [tq] = await db(`SELECT testId, id FROM test_question WHERE questionId = ? ORDER BY testId LIMIT 1`, [questionId]);
    return { testId: tq.testId, questionId, testQuestionId: tq.id, questionTitle: await questionTitleOf(questionId), created: false };
  }

  // nada compartilhado no banco — força o cenário: pega qualquer test_question
  // existente e duplica o vínculo da questão numa segunda prova (mesma técnica
  // usada manualmente nesta sessão com a questão 1543).
  const [anyTq] = await db(`SELECT id, testId, questionId, questionGroupId FROM test_question ORDER BY id LIMIT 1`);
  if (!anyTq) throw new Error('Banco local sem nenhum test_question — não tem questão pra compartilhar.');

  const [otherTest] = await db(`SELECT id FROM test WHERE id != ? ORDER BY id LIMIT 1`, [anyTq.testId]);
  if (!otherTest) throw new Error('Banco local só tem uma prova — precisa de pelo menos duas pra simular compartilhamento.');

  const [res]: any = await connectionPool.query(
    `INSERT INTO test_question (\`order\`, answer, active, testId, questionId, questionGroupId, createdAt)
     VALUES (99, 'A', 1, ?, ?, ?, NOW())`,
    [otherTest.id, anyTq.questionId, anyTq.questionGroupId]
  );
  void res;

  return { testId: anyTq.testId, questionId: anyTq.questionId, testQuestionId: anyTq.id, questionTitle: await questionTitleOf(anyTq.questionId), created: true };
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

async function main() {
  const shared = await findOrCreateSharedQuestion();
  const multiSkill = await findOrCreateMultiSkillQuestion();
  process.stdout.write(JSON.stringify({ shared, multiSkill }));
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => connectionPool.end());
