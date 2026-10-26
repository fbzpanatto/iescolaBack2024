import { connectionPool } from "../services/db";
import { deletarDoS3, moverParaLessons } from "../services/s3.service";

class LessonRepository {

  async createLesson(name: string, disciplineId: number, classroomNumber: number, s3Key: string, createdByUser: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      // Trava a linha da disciplina pra serializar o cálculo do lessonNumber
      // entre inserções concorrentes na mesma disciplina.
      await conn.query(
        `SELECT id FROM discipline WHERE id = ? FOR UPDATE`,
        [disciplineId]
      );

      const [rows] = await conn.query(
        `
      SELECT COALESCE(MAX(lessonNumber), 0) AS maxNumber
      FROM lesson
      WHERE disciplineId = ? AND classroomNumber = ?
    `,
        [disciplineId, classroomNumber]
      );
      const nextLessonNumber = (rows as Array<{ maxNumber: number }>)[0].maxNumber + 1;

      // Insere já com o s3Key temporário (tmp/...). A transação fica curta,
      // sem nenhuma chamada de rede ao S3 segurando o lock da disciplina.
      const [result] = await conn.query(
        `
      INSERT INTO lesson (name, disciplineId, classroomNumber, lessonNumber, s3Key, createdByUser, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,
        [name, disciplineId, classroomNumber, nextLessonNumber, s3Key, createdByUser]
      );

      await conn.commit();

      const lessonId = (result as any).insertId;

      // Fora da transação: promove o arquivo de tmp/ para lessons/ e atualiza o s3Key.
      let finalKey: string;
      try {
        finalKey = await moverParaLessons(s3Key);
        await conn.query(
          `UPDATE lesson SET s3Key = ? WHERE id = ?`,
          [finalKey, lessonId]
        );
      }
      catch (moveError) {
        // A promoção do arquivo falhou: a atividade nasceu quebrada (sem arquivo válido).
        // Como ela nunca chegou a existir de verdade, desfazemos a criação apagando o
        // registro. Isso NÃO fere a regra "lesson nunca é deletada" — não é a exclusão
        // de uma atividade real, é o rollback de uma criação que falhou pela metade.
        console.error('Falha ao promover arquivo da lesson; desfazendo criação:', moveError);
        await conn.query(`DELETE FROM lesson WHERE id = ?`, [lessonId]);
        throw moveError;
      }

      return { id: lessonId, lessonNumber: nextLessonNumber, s3Key: finalKey };
    }
    catch (error) {
      if (conn) { await conn.rollback(); }
      console.error(error);
      throw error;
    }
    finally {
      if (conn) { conn.release(); }
    }
  }

  async qGetAllLessons(search: string, disciplineId: number | null, classroomNumber: number | null, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const queryParams: any[] = [];

      let where = `WHERE 1 = 1`;

      // A coluna é utf8mb4_bin (sensível a caixa e acento). O COLLATE aqui torna
      // a busca insensível aos dois, então "fracoes" encontra "FRAÇÕES".
      if (search) {
        where += ` AND l.name COLLATE utf8mb4_unicode_ci LIKE ?`;
        queryParams.push(`%${search}%`);
      }

      if (disciplineId) {
        where += ` AND l.disciplineId = ?`;
        queryParams.push(disciplineId);
      }

      if (classroomNumber) {
        where += ` AND l.classroomNumber = ?`;
        queryParams.push(classroomNumber);
      }

      const query =

        `
      SELECT
        l.id AS id,
        l.name AS name,
        CONCAT('AULA ', LPAD(l.lessonNumber, 2, '0')) AS lessonName,
        l.classroomNumber AS cNumber,
        CONCAT(l.classroomNumber, 'º ANO') AS cName,
        d.id AS dId,
        UPPER(d.name) AS dName,
        l.s3Key AS s3Key
      FROM lesson l
        INNER JOIN discipline d ON l.disciplineId = d.id
      ${where}
      ORDER BY d.name, l.classroomNumber, l.lessonNumber
      LIMIT ? OFFSET ?
    `

      queryParams.push(limit, offset);

      const [ queryResult ] = await conn.query(query, queryParams)

      return queryResult as Array<{ id: number, name: string, lessonName: string, cNumber: number, cName: string, dId: number, dName: string, s3Key: string }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qGetLessonById(lessonId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const query =

        `
      SELECT
        l.id AS id,
        l.name AS name,
        CONCAT('AULA ', LPAD(l.lessonNumber, 2, '0')) AS lessonName,
        l.classroomNumber AS cNumber,
        CONCAT(l.classroomNumber, 'º ANO') AS cName,
        d.id AS dId,
        UPPER(d.name) AS dName,
        l.s3Key AS s3Key
      FROM lesson l
        INNER JOIN discipline d ON l.disciplineId = d.id
      WHERE l.id = ?
    `

      const [ queryResult ] = await conn.query(query, [lessonId])

      return (queryResult as Array<{ id: number, name: string, lessonName: string, cNumber: number, cName: string, dId: number, dName: string, s3Key: string }>)[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async updateLessonById(lessonId: number, name: string, novoS3Key: string | null, updatedByUser: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const [rows] = await conn.query(
        `SELECT s3Key FROM lesson WHERE id = ?`,
        [lessonId]
      );
      const atual = (rows as Array<{ s3Key: string }>)[0];

      if (!atual) { return null }

      let finalKey = atual.s3Key;

      // Só promove quando veio arquivo novo. A promoção acontece ANTES do UPDATE:
      // se o S3 falhar, nada é alterado no banco e a atividade continua íntegra
      // apontando para o arquivo anterior.
      if (novoS3Key && novoS3Key !== atual.s3Key) {
        finalKey = await moverParaLessons(novoS3Key);
      }

      await conn.query(
        `
      UPDATE lesson
      SET name = ?, s3Key = ?, updatedAt = NOW(), updatedByUser = ?
      WHERE id = ?
    `,
        [name, finalKey, updatedByUser, lessonId]
      );

      // Arquivo antigo só é apagado depois que o banco já aponta para o novo.
      // A guarda de prefixo impede a exclusão de qualquer coisa fora de lessons/.
      if (finalKey !== atual.s3Key && atual.s3Key.startsWith('lessons/')) {
        try { await deletarDoS3(atual.s3Key) }
        catch (deleteError) {
          // Falha aqui não invalida a edição: o registro já está correto e o
          // arquivo órfão apenas ocupa espaço no bucket.
          console.error('Falha ao remover arquivo antigo da lesson:', deleteError);
        }
      }

      return { id: lessonId, name, s3Key: finalKey };
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async upsertStudentLesson(studentId: number, lessonId: number, grade: number | null) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      // A chave única (studentId, lessonId) garante um registro por aluno/atividade.
      // Refazer a atividade sobrescreve a execução anterior, sem manter histórico.
      // COALESCE preserva a nota já registrada quando a nova execução não envia nota.
      const query =

        `
      INSERT INTO student_lesson (studentId, lessonId, executedAt, grade)
      VALUES (?, ?, NOW(), ?)
      ON DUPLICATE KEY UPDATE executedAt = NOW(), grade = COALESCE(?, grade)
    `

      await conn.query(query, [studentId, lessonId, grade, grade])

      return { studentId, lessonId, grade }
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const lessonRepository = new LessonRepository()
