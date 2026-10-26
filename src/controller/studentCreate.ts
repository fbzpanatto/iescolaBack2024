import { connectionPool } from "../services/db";
import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Student } from "../model/Student";
import { PER_CAT as pc } from "../utils/enums";
import { State } from "../model/State";
import { SaveStudent, UserInterface } from "../interfaces/interfaces";
import getTimeZone from "../utils/getTimeZone";
import { yearRepository } from "../repositories/year.repository";
import { catalogRepository } from "../repositories/catalog.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { classroomRepository } from "../repositories/classroom.repository";
import { studentSimilarityService } from "../services/student-similarity.service";

class StudentCreateController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async saveWithAuth(body: SaveStudent, authUser: UserInterface) {

    const rosterNumber = parseInt(body.rosterNumber, 10);
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user);
      const tClasses = await teacherRepository.qTeacherClassrooms(authUser.user);
      const qCurrentYear = await yearRepository.qCurrentYear();
      const state = await catalogRepository.qState(body.state) as State;
      const classroom = await classroomRepository.qClassroom(body.classroom);

      const safeBirthDate = (body.birth as any).split('T')[0];

      // Busca das Deficiências
      let disabilities: any[] = [];
      if (body.disabilities && body.disabilities.length > 0) {
        const placeholders = body.disabilities.map(() => '?').join(',');
        const [disRows] = await conn.query(`SELECT id, name, official FROM disability WHERE id IN (${placeholders})`, body.disabilities);
        disabilities = disRows as any[];
      }

      // Busca da Categoria de Aluno
      const [categoryRows] = await conn.query(`SELECT id, name, active FROM person_category WHERE id = ? LIMIT 1`, [pc.ALUN]);
      const category = (categoryRows as any[])[0];
      if (!category) { await conn.rollback(); return { status: 500, message: "Erro interno: Categoria de aluno não encontrada no sistema." } }

      const personData: any = { name: body.name.toUpperCase().trim(), birth: safeBirthDate, category: category };

      if (!qCurrentYear) { await conn.rollback(); return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." } }

      // BUSCA 1: CHECAGEM DE POTENCIAIS DUPLICATAS
      const sqlDuplicates = `
        SELECT 
          s.id AS s_id, s.ra AS s_ra, s.dv AS s_dv,
          p.id AS p_id, p.name AS p_name, p.birth AS p_birth,
          sc.id AS sc_id, sc.endedAt AS sc_endedAt,
          c.id AS c_id, c.shortName AS c_shortName,
          sch.id AS sch_id, sch.shortName AS sch_shortName,
          y.id AS y_id, y.name AS y_name
        FROM student s
        LEFT JOIN person p ON s.personId = p.id
        LEFT JOIN student_classroom sc ON sc.studentId = s.id
        LEFT JOIN classroom c ON sc.classroomId = c.id
        LEFT JOIN school sch ON c.schoolId = sch.id
        LEFT JOIN year y ON sc.yearId = y.id
        WHERE UPPER(TRIM(p.name)) = ? AND DATE(p.birth) = DATE(?)
      `;

      // Utilizando a data fatiada no array de parâmetros do MySQL
      const [duplicateRows] = await conn.query(sqlDuplicates, [body.name.toUpperCase().trim(), safeBirthDate]);

      const potentialDuplicatesMap = new Map();

      for (const row of (duplicateRows as any[])) {
        if (!potentialDuplicatesMap.has(row.s_id)) { potentialDuplicatesMap.set(row.s_id, { ra: row.s_ra, dv: row.s_dv, person: { name: row.p_name, birth: row.p_birth }, studentClassrooms: [] }) }
        if (row.sc_id) { potentialDuplicatesMap.get(row.s_id).studentClassrooms.push({ endedAt: row.sc_endedAt, classroom: { shortName: row.c_shortName, school: { shortName: row.sch_shortName } }, year: { name: row.y_name } }) }
      }

      const potentialDuplicates = Array.from(potentialDuplicatesMap.values());

      if (potentialDuplicates.length > 0) {
        for (const existing of potentialDuplicates) {
          const raExistente = parseInt(existing.ra);
          const raNovoInt = parseInt(body.ra);
          const diferencaRA = Math.abs(raExistente - raNovoInt);

          if (existing.ra !== body.ra && diferencaRA < 1000) {
            let lastRecord;
            const activeRecord = existing.studentClassrooms.find((sc: any) => sc.endedAt === null);

            if (activeRecord) { lastRecord = activeRecord }
            else if (existing.studentClassrooms.length > 0) {
              lastRecord = existing.studentClassrooms.reduce((prev: any, current: any) => {
                const prevDate = prev.endedAt ? new Date(prev.endedAt).getTime() : 0;
                const currDate = current.endedAt ? new Date(current.endedAt).getTime() : 0;
                return currDate > prevDate ? current : prev;
              });
            }

            await conn.rollback();
            return { status: 409, message: `⚠️ ALUNO JÁ CADASTRADO!\n\nJá existe um aluno com os mesmos dados:\n\nNome: ${existing.person.name}\nData de Nascimento: ${new Date(existing.person.birth).toLocaleDateString('pt-BR')}\nRA Existente: ${existing.ra}-${existing.dv}\nRA Tentado: ${body.ra}-${body.dv}\n\n${lastRecord ? `Último registro: ${lastRecord.classroom.shortName} - ${lastRecord.classroom.school.shortName} (${lastRecord.year.name})\n${activeRecord ? `\n⚠️ Este aluno está ATIVO nesta sala. Use o menu MATRÍCULAS ATIVAS para transferência.` : `\n⚠️ Use o menu PASSAR DE ANO no ano ${lastRecord.year.name} para reativar este aluno.`}` : ''}\n\nSe você tem certeza de que são pessoas diferentes, solicite ao Administrador do sistema.` };
          }
        }
      }

      // BUSCA 2: RAs NA MESMA FAIXA
      const raNumerico = parseInt(body.ra);
      const raBase = Math.floor(raNumerico / 100) * 100;

      const sqlSameRange = `
        SELECT s.ra AS s_ra, s.dv AS s_dv, p.name AS p_name, p.birth AS p_birth
        FROM student s
        LEFT JOIN person p ON s.personId = p.id
        WHERE CAST(s.ra AS UNSIGNED) BETWEEN ? AND ? AND s.ra != ?
      `;

      const [rowsSameRange] = await conn.query(sqlSameRange, [raBase, raBase + 99, body.ra]);

      const studentsSameRARange = (rowsSameRange as any[]).map(r => ({ ra: r.s_ra, dv: r.s_dv, person: { name: r.p_name, birth: r.p_birth } }));

      // CRIA A DATA DE EXIBIÇÃO SEGURA (Inverte YYYY-MM-DD para DD/MM/YYYY)
      const displayBirthNew = safeBirthDate.split('-').reverse().join('/');

      for (const existing of studentsSameRARange) {
        const similarity = studentSimilarityService.isSimilar(existing.person.name, body.name);

        if (similarity) {
          const birthExisting = new Date(existing.person.birth);

          // Mantemos o objeto Date apenas para a matemática de dias
          const birthNew = new Date(safeBirthDate + 'T12:00:00'); // Força meio-dia para evitar pulo de dia no cálculo

          const diffDays = Math.ceil(Math.abs(birthExisting.getTime() - birthNew.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 365) {
            await conn.rollback();
            return { status: 409, message: `⚠️ POSSÍVEL DUPLICATA DETECTADA!\n\nFoi encontrado um aluno com dados similares:\n\n• Existente: ${existing.person.name} (RA: ${existing.ra}-${existing.dv} | Nasc: ${birthExisting.toLocaleDateString('pt-BR', { timeZone: 'UTC' })})\n• Novo: ${body.name} (RA: ${body.ra}-${body.dv} | Nasc: ${displayBirthNew})\n\nMotivo: RAs na mesma faixa (${raBase} a ${raBase + 99}).\n\nVerifique se não é o mesmo aluno. Em caso de dúvida, consulte o Administrador.`};
          }
        }
      }

      // BUSCA 3: CHECAGEM SIMPLES PRE-EXISTS
      const sqlPreExists = `
        SELECT s.ra AS s_ra, p.name AS p_name, p.birth AS p_birth
        FROM student s
        LEFT JOIN person p ON s.personId = p.id
        WHERE s.ra = ? LIMIT 1
      `;

      const [rowsPreExists] = await conn.query(sqlPreExists, [body.ra]);
      const preExistsRow = (rowsPreExists as any[])[0];

      if (preExistsRow) {
        const formattedDate = new Date(preExistsRow.p_birth).toISOString().slice(0, 10);
        const sameBirthDate = formattedDate === safeBirthDate;

        if (studentSimilarityService.isSimilar(preExistsRow.p_name, body.name) && sameBirthDate) {
          await conn.rollback();
          const message = `Existe um aluno com dados semelhantes ao qual está tentando cadastrar. ${preExistsRow.p_name}, RA ${preExistsRow.s_ra} e nascimento ${ safeBirthDate }. Comunique ao Administrador do sistema.`
          return { status: 409, message };
        }
      }

      // BUSCA 4: CHECAGEM EXATA DE RA e DV
      const [rowsExists] = await conn.query(`SELECT id FROM student WHERE ra = ? AND dv = ? LIMIT 1`, [body.ra, body.dv]);
      const existsCheck = (rowsExists as any[])[0];

      if (existsCheck) {
        const sqlEl = `
          SELECT 
            s.id AS s_id, s.active AS s_active, p.name AS p_name,
            sc.id AS sc_id, sc.endedAt AS sc_endedAt,
            c.shortName AS c_shortName, sch.shortName AS sch_shortName, y.name AS y_name
            FROM student s
            LEFT JOIN person p ON s.personId = p.id
            LEFT JOIN student_classroom sc ON sc.studentId = s.id
            LEFT JOIN classroom c ON sc.classroomId = c.id
            LEFT JOIN school sch ON c.schoolId = sch.id
            LEFT JOIN year y ON sc.yearId = y.id
            WHERE s.ra = ? AND s.dv = ? AND (sc.endedAt IS NULL OR sc.endedAt < ?)
        `;

        const [rowsEl] = await conn.query(sqlEl, [body.ra, body.dv, new Date()]);
        const typedRowsEl = rowsEl as any[];

        if (typedRowsEl.length > 0) {
          const el: any = { active: typedRowsEl[0].s_active, person: { name: typedRowsEl[0].p_name }, studentClassrooms: [] };

          for (const row of typedRowsEl) {
            if (row.sc_id) { el.studentClassrooms.push({ endedAt: row.sc_endedAt, classroom: { shortName: row.c_shortName, school: { shortName: row.sch_shortName } }, year: { name: row.y_name } }) }
          }

          let preR: any;
          const actStClassroom = el.studentClassrooms.find((sc: any) => sc.endedAt === null);

          if (actStClassroom) { preR = actStClassroom }
          else { preR = el.studentClassrooms.find((sc: any) => getTimeZone(sc.endedAt) === Math.max(...el.studentClassrooms.map((sc: any) => getTimeZone(sc.endedAt)))) }

          if (!el.active) {
            await conn.rollback();
            return { status: 409, message: `RA existente. ${el.person.name} se formou em: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano de ${preR?.year.name}.` };
          }

          await conn.rollback();
          return { status: 409, message: `Já existe um aluno com o RA informado. ${el.person.name} tem como último registro: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano ${preR?.year.name}. ${preR?.endedAt === null ? `Acesse o menu MATRÍCULAS ATIVAS > OUTROS ALUNOS no ano de ${preR.year.name} e solicite sua transferência.` : `Acesse o menu PASSAR DE ANO no ano de ${preR.year.name}.`}`};
        }
      }

      const message = "Você não tem permissão para criar um aluno nesta sala.";
      if (authUser.category === pc.PROF) { if (!tClasses.classrooms.includes(classroom.id)) { await conn.rollback(); return { status: 403, message } } }

      // FASE DE ESCRITA

      // Formatação do DV
      let formatedDv;
      const digit = body.dv.replace(/\D/g, "");
      if (digit.length) { formatedDv = body.dv; }
      else { formatedDv = body.dv.toUpperCase(); }

      // 1. Inserir Person
      const insertIntoParams = [personData.name, personData.birth, personData.category.id]
      const [resultPerson]: any = await conn.query(`INSERT INTO person (name, birth, categoryId) VALUES (?, ?, ?)`, insertIntoParams);
      personData.id = resultPerson.insertId;

      // 2. Inserir Student (com observações)
      const [resultStudent]: any = await conn.query(
        `INSERT INTO student (ra, dv, active, personId, stateId, observationOne, observationTwo, createdByUser, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [ body.ra, formatedDv, true, personData.id, state.id, body.observationOne, body.observationTwo, qUserTeacher.person.user.id ]
      );

      // Constrói o objeto do estudante final para retorno e relacionamentos
      const studentData: any = { id: resultStudent.insertId, person: personData, ra: body.ra, dv: formatedDv, state: state, observationOne: body.observationOne, observationTwo: body.observationTwo, active: true, createdByUser: qUserTeacher.person.user.id, createdAt: new Date() };

      // 3. Inserir Disabilities (Se houver)
      if (disabilities && disabilities.length > 0) {
        const disValues = disabilities.map((d: any) => [studentData.id, d.id, new Date(), qUserTeacher.person.user.id]);
        await conn.query(`INSERT INTO student_disability (studentId, disabilityId, startedAt, createdByUser) VALUES ?`, [disValues]);
      }

      // 4. Inserir StudentClassroom
      await conn.query(
        `INSERT INTO student_classroom (studentId, classroomId, yearId, rosterNumber, startedAt, createdByUser) VALUES (?, ?, ?, ?, NOW(), ?)`,
        [studentData.id, classroom.id, qCurrentYear.id, rosterNumber, qUserTeacher.person.user.id]
      );

      // 5. Obter Status de Transferência "Novo"
      const [rowsTStatus] = await conn.query(`SELECT id FROM transfer_status WHERE id = 5 AND name = 'Novo' LIMIT 1`);
      const tStatusId = (rowsTStatus as any[])[0]?.id;

      // 6. Inserir Transfer
      await conn.query(
        `INSERT INTO transfer (startedAt, endedAt, requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, statusId, createdByUser, yearId) VALUES (NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
        [qUserTeacher.id, classroom.id, classroom.id, qUserTeacher.id, studentData.id, tStatusId, qUserTeacher.person.user.id, qCurrentYear.id]
      );

      await conn.commit();

      return { status: 201, data: studentData as unknown as Student };
    }

    catch (error: any) { if (conn) await conn.rollback(); console.error(error); return { status: 500, message: error.message } }
    finally { if (conn) conn.release() }
  }
}

export const studentCreateController = new StudentCreateController();
