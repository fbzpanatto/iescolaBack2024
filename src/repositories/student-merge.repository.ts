import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";

class StudentMergeRepository {

  async getDuplicatedStudents(masterUser: boolean, limit: number, offset: number, search: string = '') {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      // Limpa a busca para evitar quebras no LIKE
      const searchTermCleaned = search.trim();
      const searchParam = searchTermCleaned ? `%${searchTermCleaned}%` : '';

      // Parâmetros:
      // 1º: string original (para o IF do ? = '')
      // 2º, 3º e 4º: params do LIKE (nome, ra_certo, ra_errado)
      // 5º e 6º: limit e offset
      const params: any[] = [searchTermCleaned, searchParam, searchParam, searchParam, limit, offset];

      const query = `
    WITH AlunosDuplicados AS (
      SELECT 
        p.name COLLATE utf8mb4_unicode_ci AS nome_normalizado,
        DATE(p.birth) AS data_nascimento
      FROM student s
      INNER JOIN person p ON s.personId = p.id
      GROUP BY p.name COLLATE utf8mb4_unicode_ci, DATE(p.birth)
      HAVING COUNT(s.id) = 2
    ),
    Pares AS (
      SELECT 
        d.nome_normalizado,
        d.data_nascimento,
        MAX(s.id) AS id_A,
        MIN(s.id) AS id_B
      FROM AlunosDuplicados d
      INNER JOIN person p ON p.name COLLATE utf8mb4_unicode_ci = d.nome_normalizado AND DATE(p.birth) = d.data_nascimento
      INNER JOIN student s ON s.personId = p.id
      GROUP BY d.nome_normalizado, d.data_nascimento
    ),
    Detalhes AS (
      SELECT 
        Pares.nome_normalizado,
        
        sA.id AS id_A, sA.ra AS ra_A, sA.dv AS dv_A, pA.birth AS birth_A,
        (SELECT COUNT(*) FROM student_classroom WHERE studentId = sA.id AND endedAt IS NULL) AS ativas_A,
        (SELECT COUNT(*) FROM student_question WHERE studentId = sA.id) AS q_A,
        (SELECT COUNT(*) FROM student_classroom WHERE studentId = sA.id) AS salas_A,
        
        sB.id AS id_B, sB.ra AS ra_B, sB.dv AS dv_B,
        (SELECT COUNT(*) FROM student_classroom WHERE studentId = sB.id AND endedAt IS NULL) AS ativas_B,
        (SELECT COUNT(*) FROM student_question WHERE studentId = sB.id) AS q_B,
        (SELECT COUNT(*) FROM student_classroom WHERE studentId = sB.id) AS salas_B
      FROM Pares
      INNER JOIN student sA ON sA.id = Pares.id_A
      INNER JOIN person pA ON pA.id = sA.personId
      INNER JOIN student sB ON sB.id = Pares.id_B
    ),
    Vencedor AS (
      SELECT *,
        CASE 
          -- Regra Mestra: Erro de cópia do SED (Zero à esquerda perde automaticamente)
          WHEN ra_A NOT LIKE '0%' AND ra_B LIKE '0%' THEN 1
          WHEN ra_B NOT LIKE '0%' AND ra_A LIKE '0%' THEN 0
          
          -- Regra 1: Desempate por Matrícula ativa
          WHEN ativas_A > ativas_B THEN 1
          WHEN ativas_B > ativas_A THEN 0
          
          -- Regra 2: Maior uso em provas
          WHEN q_A > q_B THEN 1
          WHEN q_B > q_A THEN 0
          
          -- Regra 3: Histórico de turmas
          WHEN salas_A >= salas_B THEN 1
          ELSE 0 
        END AS a_vence
      FROM Detalhes
    )
    
    SELECT 
      nome_normalizado AS aluno,
      
      -- Data formatada para visualização na tela (ex: 01/02/2026)
      DATE_FORMAT(birth_A, '%d/%m/%Y') AS data_nascimento_ptbr,
      
      -- Data original para manter o script de unificação funcionando
      birth_A AS data_nascimento_db,
      
      CASE WHEN a_vence = 1 THEN id_A ELSE id_B END AS studentIdCerto,
      CASE WHEN a_vence = 1 THEN ra_A ELSE ra_B END AS ra_certo,
      CASE WHEN a_vence = 1 THEN dv_A ELSE dv_B END AS dv_certo,
      
      CASE WHEN a_vence = 1 THEN id_B ELSE id_A END AS studentIdDeletar,
      CASE WHEN a_vence = 1 THEN ra_B ELSE ra_A END AS ra_errado,
      CASE WHEN a_vence = 1 THEN dv_B ELSE dv_A END AS dv_errado,
      
      CASE WHEN a_vence = 1 THEN ativas_A ELSE ativas_B END AS ativas_certo,
      CASE WHEN a_vence = 1 THEN ativas_B ELSE ativas_A END AS ativas_errado,
      
      CASE WHEN a_vence = 1 THEN q_A ELSE q_B END AS questoes_certo,
      CASE WHEN a_vence = 1 THEN q_B ELSE q_A END AS questoes_errado,
      
      CASE
        WHEN ra_A NOT LIKE '0%' AND ra_B LIKE '0%' OR ra_B NOT LIKE '0%' AND ra_A LIKE '0%' THEN 'RA SED (Zero à esquerda)'
        WHEN ativas_A != ativas_B THEN 'Matrícula Ativa'
        WHEN q_A != q_B THEN 'Volume de Provas'
        ELSE 'ID Recente / Empate Técnico'
      END AS justificativa
      
    FROM Vencedor
    WHERE (? = '' OR nome_normalizado COLLATE utf8mb4_unicode_ci LIKE ? OR ra_A LIKE ? OR ra_B LIKE ?)
    ORDER BY nome_normalizado ASC
    LIMIT ? OFFSET ?
  `;

      const [rows] = await conn.query(query, params);
      return Helper.formatDuplicatedStudent((rows as any[]));
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release(); } }
  }

  async mergeDuplicatedStudent(el: { wrongId: number, rightId: number, ra: string, dv: string, birth: string }) {

    const { wrongId, rightId, ra, dv, birth } = el;

    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      // ============================================================================
      // STEP 1: TABELA 'student_question'
      // ============================================================================
      await conn.query(`
      DELETE FROM student_question
      WHERE studentId = ?
      AND testQuestionId IN (
        SELECT testQuestionId FROM (
          SELECT testQuestionId FROM student_question WHERE studentId = ?
        ) AS tmp
      )
    `, [wrongId, rightId]);

      await conn.query(`UPDATE student_question SET studentId = ? WHERE studentId = ?`, [rightId, wrongId]);

      // ============================================================================
      // STEP 2: TABELA 'reading_fluency'
      // ============================================================================
      await conn.query(`
      DELETE FROM reading_fluency
      WHERE studentId = ?
      AND (testId, readingFluencyExamId) IN (
        SELECT testId, readingFluencyExamId FROM (
          SELECT testId, readingFluencyExamId FROM reading_fluency WHERE studentId = ?
        ) AS tmp
      )
    `, [wrongId, rightId]);

      await conn.query(`UPDATE reading_fluency SET studentId = ? WHERE studentId = ?`, [rightId, wrongId]);

      // ============================================================================
      // STEP 3: TABELA 'alphabetic'
      // ============================================================================
      await conn.query(`
      DELETE FROM alphabetic
      WHERE studentId = ?
      AND testId IN (
        SELECT testId FROM (
          SELECT testId FROM alphabetic WHERE studentId = ?
        ) AS tmp
      )
    `, [wrongId, rightId]);

      await conn.query(`UPDATE alphabetic SET studentId = ? WHERE studentId = ?`, [rightId, wrongId]);

      // ============================================================================
      // STEP 4: VÍNCULO DE SALAS (student_classroom) E PROVAS (student_test_status)
      // ============================================================================
      await conn.query(`
      DELETE FROM student_test_status
      WHERE studentClassroomId IN (SELECT id FROM student_classroom WHERE studentId = ?)
      AND testId IN (
        SELECT testId FROM (
          SELECT testId FROM student_test_status 
          WHERE studentClassroomId IN (SELECT id FROM student_classroom WHERE studentId = ?)
        ) AS tmp
      )
    `, [wrongId, rightId]);

      await conn.query(`
      UPDATE student_test_status sts
      JOIN student_classroom sc_old ON sts.studentClassroomId = sc_old.id
      JOIN student_classroom sc_new ON sc_old.classroomId = sc_new.classroomId
      SET sts.studentClassroomId = sc_new.id
      WHERE sc_old.studentId = ? AND sc_new.studentId = ?
    `, [wrongId, rightId]);

      await conn.query(`
      DELETE FROM student_classroom
      WHERE studentId = ?
      AND classroomId IN (
        SELECT classroomId FROM (
          SELECT classroomId FROM student_classroom WHERE studentId = ?
        ) AS tmp
      )
    `, [wrongId, rightId]);

      await conn.query(`UPDATE student_classroom SET studentId = ? WHERE studentId = ?`, [rightId, wrongId]);

      // ============================================================================
      // STEP 5: PREVENÇÃO DE ORFANATO
      // ============================================================================
      await conn.query(`UPDATE student_disability SET studentId = ? WHERE studentId = ?`, [rightId, wrongId]);

      await conn.query(`
      DELETE FROM alphabetic_first 
      WHERE studentId = ? 
      AND ? IN (SELECT studentId FROM (SELECT studentId FROM alphabetic_first) AS tmp)
    `, [wrongId, rightId]);

      await conn.query(`UPDATE alphabetic_first SET studentId = ? WHERE studentId = ?`, [rightId, wrongId]);

      // ============================================================================
      // STEP 6: LIMPEZA DAS TABELAS DE CADASTRO
      // ============================================================================
      await conn.query(`UPDATE transfer SET studentId = ? WHERE studentId = ?`, [rightId, wrongId]);

      // 6.1. Resgata o personId antigo antes de deletar o student
      const [personRows] = await conn.query(`SELECT personId FROM student WHERE id = ?`, [wrongId]);
      const personIdToDelete = (personRows as Array<any>).length > 0 ? (personRows as Array<any>)[0].personId : null;

      // Elimina a raiz do problema
      await conn.query(`DELETE FROM student WHERE id = ?`, [wrongId]);

      if (personIdToDelete) { await conn.query(`DELETE FROM person WHERE id = ?`, [personIdToDelete]) }

      // ============================================================================
      // STEP 7: ATUALIZAÇÃO DOS DADOS CADASTRAIS DO ALUNO MANTIDO
      // Precisa vir DEPOIS de deletar o duplicado: o índice único (ra, dv) rejeitaria
      // o UPDATE enquanto o registro errado ainda detivesse o mesmo RA/DV.
      // ============================================================================
      await conn.query(`UPDATE student SET ra = ?, dv = ? WHERE id = ?`, [ra, dv, rightId]);

      await conn.query(`
      UPDATE person p
      INNER JOIN student s ON p.id = s.personId
      SET p.birth = ?
      WHERE s.id = ?
    `, [birth, rightId]);

      // ============================================================================
      // STEP 8: EXECUÇÃO FINAL
      // ============================================================================
      await conn.commit();
      return { success: true, message: `Aluno ${ wrongId } mesclado em ${ rightId } com sucesso.` };
    }
    catch (error) { if (conn) { await conn.rollback(); } console.error(`Erro ao mesclar alunos (${wrongId} -> ${rightId}):`, error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const studentMergeRepository = new StudentMergeRepository()
