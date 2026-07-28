import { connectionPool } from "../services/db";
import { StudentClassroom } from "../model/StudentClassroom";
import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Student } from "../model/Student";
import { OUT_CLASSROOMS, PER_CAT as pc, TRANSFER_STATUS } from "../utils/enums";
import { State } from "../model/State";
import { InactiveNewClassroom, SaveStudent, UserInterface, JwtPayload } from "../interfaces/interfaces";
import { Request } from "express";
import { Helper, HttpError } from "../utils/helpers";
import getTimeZone from "../utils/getTimeZone";

class StudentController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async studentForm(request: Request, authUser: JwtPayload) {

    try {
      const qUt = await this.qTeacherByUser(authUser.user)
      const masterUser = qUt.person.category.id === pc.ADMN || qUt.person.category.id === pc.SUPE || qUt.person.category.id === pc.FORM

      const states = await this.qStates()
      const disabilities = await this.qDisabilities()
      const teacherClassrooms = await this.qAllTClassTx(masterUser, qUt.id)

      return { status: 200, data: { disabilities, states, teacherClassrooms } };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getAllInactivates(request: Request) {

    const limit = !isNaN(parseInt(request.query.limit as string)) ? parseInt(request.query.limit as string) : 100;
    const offset = !isNaN(parseInt(request.query.offset as string)) ? parseInt(request.query.offset as string) : 0;

    const rawSearch = (request.query.search as string) ?? "";
    const search = `%${rawSearch.trim()}%`;

    try {
      const currentYear = await this.qCurrentYear();

      if (!currentYear) {
        const message = "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema."
        return { status: 404, message }
      }

      const lastYearName = Number(currentYear.name) - 1;
      const lastYearDB = await this.qYearByName(String(lastYearName));

      if (!lastYearDB) {
        return { status: 404, message: `Não existe ano letivo anterior ou posterior a ${currentYear.name}.`}
      }

      const rows = await this.qGetAllInactivates(search, request.params.year, currentYear.id, lastYearDB.id, limit, offset)

      const preResult = Helper.inactivesMappedResult(rows)

      return { status: 200, data: preResult.map((student: any) => ({ ...student, studentClassrooms: this.getOneClassroom(student.studentClassrooms) })) };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async setInactiveNewClassroomList(body: { list: InactiveNewClassroom[] }, authUser: UserInterface) {

    try {
      const currentYear = await this.qCurrentYear();
      if (!currentYear) throw new HttpError(404, 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.');

      const lastYearName = Number(currentYear.name) - 1;
      const lastYearDB = await this.qYearByName(String(lastYearName));

      if (!lastYearDB) throw new HttpError(404, 'Não foi possível encontrar o ano letivo anterior.');

      const qUserTeacher = await this.qTeacherByUser(authUser.user);

      const everyGraduate = body.list.every((item: any) =>
        item.newClassroom.name === 'FORMANDO' &&
        item.newClassroom.school === 'PMI' &&
        item.oldClassroom.shortName.replace(/\D/g, '') === '9'
      );

      // ==========================================
      // FLUXO DE FORMANDOS (Mantido intacto)
      // ==========================================
      if (everyGraduate && body.list.length > 0) { await this.graduateStudentsBatchSQL({ list: body.list, user: qUserTeacher, year: lastYearDB }); return { status: 200, data: {} } }

      // ==========================================
      // FLUXO REGULAR EM LOTE (Transação Única)
      // ==========================================
      if (body.list.length > 0) {
        let conn;
        try {
          conn = await connectionPool.getConnection();
          await conn.beginTransaction();

          // 1. Extração de IDs para busca em Lote (Evita o N+1)
          const studentIds = body.list.map(item => item.student.id);
          const oldYearIds = [...new Set(body.list.map(item => item.oldYear))];
          const classroomIds = [...new Set(body.list.flatMap(item => [item.newClassroom.id, item.oldClassroom.id]))];

          // 2. Busca Anos Anteriores informados
          const [yearRows] = await conn.query(`SELECT id, name FROM year WHERE id IN (?)`, [oldYearIds]) as any;
          const yearsMap = new Map(yearRows.map((y: any) => [y.id, y]));

          // 3. Trava os alunos da lista — impede que duas escolas matriculem o mesmo aluno
          // ao mesmo tempo. Trava a linha de `student` (sempre existe) em vez de `student_classroom`
          // (que pode não ter nenhuma linha ativa pra travar, já que esta lista é de alunos disponíveis).
          await conn.query(`SELECT id FROM student WHERE id IN (?) FOR UPDATE`, [studentIds]);

          // 4. Verifica Matrículas Ativas em Lote
          const [activeRows] = await conn.query(`
          SELECT stu.id AS studentId, p.name AS personName, c.shortName AS classroomName, s.shortName AS schoolName, y.name AS yearName
          FROM student_classroom sc
          INNER JOIN student stu ON sc.studentId = stu.id
          INNER JOIN person p ON stu.personId = p.id
          INNER JOIN classroom c ON sc.classroomId = c.id
          INNER JOIN school s ON c.schoolId = s.id
          INNER JOIN year y ON sc.yearId = y.id
          WHERE sc.studentId IN (?) AND sc.endedAt IS NULL
          `, [studentIds]) as any;

          if (activeRows && activeRows.length > 0) {
            const el = activeRows[0];
            throw new HttpError(400, `O aluno ${el.personName} está matriculado na sala ${el.classroomName} ${el.schoolName} em ${el.yearName}. Solicite sua transferência através do menu Matrículas Ativas`);
          }

          // 5. Verifica Último Registro (Gap de Anos) em Lote
          const [lastRegisterRows] = await conn.query(`
          SELECT sc.studentId, p.name AS personName
          FROM student_classroom sc
          INNER JOIN student stu ON sc.studentId = stu.id
          INNER JOIN person p ON stu.personId = p.id
          WHERE sc.studentId IN (?)
            AND sc.yearId = ?
            AND sc.endedAt IS NOT NULL
            AND sc.endedAt = (
              SELECT MAX(sc2.endedAt) 
              FROM student_classroom sc2 
              WHERE sc2.studentId = sc.studentId AND sc2.yearId = ?
            )
          `, [studentIds, lastYearDB.id, lastYearDB.id]) as any;

          const lastRegisterMap = new Map(lastRegisterRows.map((r: any) => [r.studentId, r]));

          // 6. Busca Salas em Lote (para validação de regressão)
          const [classroomRows] = await conn.query(`SELECT id, name FROM classroom WHERE id IN (?)`, [classroomIds]) as any;
          const classMap = new Map(classroomRows.map((c: any) => [c.id, c]));

          // 7. Loop de Validação (Ocorre 100% em memória, instantâneo)
          for (const item of body.list) {
            const oldYearDB = yearsMap.get(item.oldYear) as any;
            if (!oldYearDB) throw new HttpError(404, 'Não foi possível encontrar o ano letivo informado.');

            const lr = lastRegisterMap.get(item.student.id);
            if (lr && (Number(currentYear.name) - Number(oldYearDB.name) > 1)) {
              throw new HttpError(409, `O aluno ${item.student.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.`);
            }

            const newC = classMap.get(item.newClassroom.id) as any;
            const oldC = classMap.get(item.oldClassroom.id) as any;

            if (newC && oldC) {
              const numNew = Number(newC.name.replace(/\D/g, ''));
              const numOld = Number(oldC.name.replace(/\D/g, ''));
              if (numNew < numOld) {
                throw new HttpError(400, 'Regressão de sala não é permitido.');
              }
            }
          }

          // ==========================================
          // 8. INSERÇÕES EM MASSA (Batch Inserts)
          // ==========================================
          const now = new Date();
          const createdBy = qUserTeacher.person.user.id;
          const teacherId = qUserTeacher.id;

          // Monta a Matriz de Valores para student_classroom
          const studentClassroomValues = body.list.map(item => [item.student.id, item.newClassroom.id, currentYear.id, item.rosterNumber, now, createdBy]);

          await conn.query('INSERT INTO student_classroom (studentId, classroomId, yearId, rosterNumber, startedAt, createdByUser) VALUES ?', [studentClassroomValues]);

          // Monta a Matriz de Valores para transfer
          const transferValues = body.list.map(item => [now, now, teacherId, item.newClassroom.id, item.oldClassroom.id, teacherId, item.student.id, 1, currentYear.id, createdBy]);

          await conn.query('INSERT INTO transfer (startedAt, endedAt, requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, statusId, yearId, createdByUser) VALUES ?', [transferValues]);

          // Tudo deu certo. Confirma a transação.
          await conn.commit();
        }

        catch (error) { if (conn) await conn.rollback(); throw error }
        finally { if (conn) conn.release() }
      }

      return { status: 200, data: {} };

    } catch (error: any) {
      if (error instanceof HttpError) {
        return { status: error.status, message: error.message };
      }
      // Erros inesperados de banco ou servidor caem aqui
      return { status: 500, message: error.message || 'Erro interno no servidor' };
    }
  }

  async allStudents(req: Request<{ year: string }>, authUser: JwtPayload) {
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const teacherClasses = await this.qTeacherClassrooms(authUser.user)
      const masterTeacher = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.SUPE_EI || qUserTeacher.person.category.id === pc.FORM
      const isSuperEI = qUserTeacher.person.category.id === pc.SUPE_EI

      const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
      const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

      const options = { search: req.query.search as string, year: req.params.year, teacherClasses, owner: req.query.owner as string }

      const studentsClassrooms = await this.studentsClassroomsNewImplementation(options, masterTeacher, isSuperEI, limit, offset);

      return { status: 200, data: studentsClassrooms }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneStudentById(req: Request, authUser: JwtPayload) {

    const { params } = req

    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM

      const teacherClasses = await this.qTeacherClassrooms(authUser.user)

      const preStudent = await this.qStudentFullDetail(Number(params.id))

      if (!preStudent) { return { status: 404, message: "Registro não encontrado" } }

      const data = Helper.studentDetail(preStudent)

      if (teacherClasses.classrooms.length > 0 && !teacherClasses.classrooms.includes(data.classroom.id) && !masterUser ) { return { status: 403, message: "Você não tem permissão para acessar esse registro." } }
      return { status: 200, data }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async saveWithAuth(body: SaveStudent, authUser: UserInterface) {

    const rosterNumber = parseInt(body.rosterNumber, 10);
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const qUserTeacher = await this.qTeacherByUser(authUser.user);
      const tClasses = await this.qTeacherClassrooms(authUser.user);
      const qCurrentYear = await this.qCurrentYear();
      const state = await this.qState(body.state) as State;
      const classroom = await this.qClassroom(body.classroom);

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
        const similarity = this.isSimilar(existing.person.name, body.name);

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

        if (this.isSimilar(preExistsRow.p_name, body.name) && sameBirthDate) {
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

  async setFirstLevel(body: any, authUser: UserInterface) {
    try {

      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      if([pc.MONI, pc.SECR].includes(qUserTeacher.person.category.id)) { return { status: 403, message: 'Você não tem permissão para modificar este registro.' } }

      await this.qSetFirstLevel(Number(body.student.id), Number(body.level.id), authUser.user)
      return { status: 200, data: { message: 'done' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateIdWithAuth(studentId: number | string, body: any, authUser: UserInterface) {
    let conn;
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ studentRows ] = await conn.query(
        `SELECT s.id, s.ra, s.dv, s.observationOne, s.observationTwo, s.personId, s.stateId
         FROM student s
         WHERE s.id = ?
         LIMIT 1`,
        [Number(studentId)]
      );
      const dbStudent = (studentRows as any[])[0];

      const [ classroomRows ] = await conn.query(`SELECT id, shortName FROM classroom WHERE id = ? LIMIT 1`, [Number(body.classroom)]);
      const bodyClass = (classroomRows as any[])[0];

      const [ stClassRows ] = await conn.query(
        `SELECT sc.id, sc.classroomId, c.shortName AS classroomShortName
         FROM student_classroom sc
           INNER JOIN classroom c ON c.id = sc.classroomId
         WHERE sc.id = ? AND sc.studentId = ? AND sc.endedAt IS NULL
         LIMIT 1`,
        [Number(body.currentStudentClassroomId), Number(studentId)]
      );
      const stClass = (stClassRows as any[])[0];

      if (!dbStudent) { await conn.commit(); return { status: 404, message: "Registro não encontrado" } }
      if (!stClass) { await conn.commit(); return { status: 404, message: "Registro não encontrado" } }
      if (!bodyClass) { await conn.commit(); return { status: 404, message: "Sala não encontrada" } }

      const cBodySRA: string = `${body.ra}${body.dv}`;
      const databaseStudentRa = `${dbStudent.ra}${dbStudent.dv}`;

      if (databaseStudentRa !== cBodySRA && qUserTeacher.person.category.id != pc.ADMN) {
        await conn.commit();
        return { status: 403, message: 'Você não tem permissão para modificar o RA de um aluno. Solicite ao Administrador do sistema.' }
      }

      if (databaseStudentRa !== cBodySRA) {
        const [ raExistsRows ] = await conn.query(`SELECT id FROM student WHERE ra = ? AND dv = ? LIMIT 1`, [body.ra, body.dv]);
        if ((raExistsRows as any[])[0]) { await conn.commit(); return { status: 409, message: "Já existe um aluno com esse RA" } }
      }

      const canChange: number[] = [ pc.ADMN, pc.DIRE, pc.VICE, pc.COOR, pc.SECR ]

      const message: string = "Você não tem permissão para alterar a sala de um aluno por aqui. Solicite a alguém com nível de acesso superior ao seu."
      if (!canChange.includes(qUserTeacher.person.category.id) && stClass.classroomId != bodyClass.id) {
        await conn.commit();
        return { status: 403, message };
      }

      const currentYear = await this.qCurrentYear();

      const [ pendingRows ] = await conn.query(
        `SELECT t.id, reqP.name AS requesterPersonName, rc.shortName AS requestedClassroomShortName, rsch.shortName AS requestedSchoolShortName
         FROM transfer t
           INNER JOIN teacher req ON req.id = t.requesterId
           INNER JOIN person reqP ON reqP.id = req.personId
           INNER JOIN classroom rc ON rc.id = t.requestedClassroomId
           INNER JOIN school rsch ON rsch.id = rc.schoolId
         WHERE t.studentId = ? AND t.currentClassroomId = ? AND t.statusId = ? AND t.yearId = ? AND t.endedAt IS NULL
         LIMIT 1`,
        [dbStudent.id, stClass.classroomId, TRANSFER_STATUS.PENDING, currentYear.id]
      );
      const pendingTransfer = (pendingRows as any[])[0];

      if (pendingTransfer) {
        await conn.commit();
        return { status: 403, message: `Existe um pedido de transferência ativo feito por: ${pendingTransfer.requesterPersonName} para a sala: ${pendingTransfer.requestedClassroomShortName} - ${pendingTransfer.requestedSchoolShortName}` };
      }

      if (stClass.classroomId != bodyClass.id && canChange.includes(qUserTeacher.person.category.id)) {

        const newNumber: number = Number(bodyClass.shortName.replace(/\D/g, ""))
        const oldNumber: number = Number(stClass.classroomShortName.replace(/\D/g, ""))

        if (!isNaN(newNumber) && !isNaN(oldNumber) && !OUT_CLASSROOMS.includes(bodyClass.id)) {
          if (newNumber < oldNumber) { await conn.commit(); return { status: 404, message: 'Regressão de sala não é permitido.' } }
        }

        const now = this.toSqlUtcDateTime(new Date());

        await conn.query(`UPDATE student_classroom SET endedAt = ?, updatedByUser = ? WHERE id = ?`, [now, qUserTeacher.person.user.id, stClass.id]);

        const [ lastRosterRows ] = await conn.query(
          `SELECT rosterNumber FROM student_classroom WHERE yearId = ? AND classroomId = ? ORDER BY rosterNumber DESC LIMIT 1 FOR UPDATE`,
          [currentYear.id, bodyClass.id]
        );
        const last = ((lastRosterRows as any[])[0]?.rosterNumber ?? 0) + 1;

        await conn.query(
          `INSERT INTO student_classroom (studentId, classroomId, yearId, rosterNumber, startedAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?)`,
          [dbStudent.id, bodyClass.id, currentYear.id, last, now, qUserTeacher.person.user.id]
        );

        await conn.query(
          `INSERT INTO transfer (createdByUser, startedAt, endedAt, requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, statusId, yearId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [qUserTeacher.person.user.id, now, now, qUserTeacher.id, bodyClass.id, stClass.classroomId, qUserTeacher.id, dbStudent.id, TRANSFER_STATUS.ACCEPTED, currentYear.id]
        );
      }

      if (stClass.classroomId === bodyClass.id) {
        await conn.query(`UPDATE student_classroom SET rosterNumber = ?, createdByUser = ? WHERE id = ?`, [body.rosterNumber, qUserTeacher.person.user.id, stClass.id]);
      }

      const [ stateRows ] = await conn.query(`SELECT id FROM state WHERE id = ? LIMIT 1`, [body.state]);
      const stateId = (stateRows as any[])[0]?.id ?? null;

      await conn.query(
        `UPDATE person SET name = ?, birth = ? WHERE id = ?`,
        [body.name.toUpperCase().trim(), this.toSqlUtcDateTime(body.birth), dbStudent.personId]
      );

      await conn.query(
        `UPDATE student SET ra = ?, dv = ?, updatedAt = ?, updatedByUser = ?, observationOne = ?, observationTwo = ?, stateId = ? WHERE id = ?`,
        [body.ra, body.dv, this.toSqlUtcDateTime(new Date()), qUserTeacher.person.user.id, body.observationOne, body.observationTwo, stateId, dbStudent.id]
      );

      const [ activeDisabilityRows ] = await conn.query(
        `SELECT id, disabilityId FROM student_disability WHERE studentId = ? AND endedAt IS NULL`,
        [dbStudent.id]
      );
      const activeDisabilities = activeDisabilityRows as { id: number, disabilityId: number }[];
      const currentDisabilityIds = activeDisabilities.map(d => d.disabilityId);
      const bodyDisabilityIds: number[] = body.disabilities ?? [];

      const toCreate = bodyDisabilityIds.filter(id => !currentDisabilityIds.includes(id));
      const toEnd = activeDisabilities.filter(d => !bodyDisabilityIds.includes(d.disabilityId));

      if (toCreate.length > 0) {
        const values = toCreate.map(disabilityId => [dbStudent.id, disabilityId, this.toSqlUtcDateTime(new Date()), qUserTeacher.person.user.id]);
        await conn.query(`INSERT INTO student_disability (studentId, disabilityId, startedAt, createdByUser) VALUES ?`, [values]);
      }

      for (const item of toEnd) {
        await conn.query(`UPDATE student_disability SET endedAt = ?, updatedByUser = ? WHERE id = ?`, [this.toSqlUtcDateTime(new Date()), qUserTeacher.person.user.id, item.id]);
      }

      await conn.commit();

      const fullDetail = await this.qStudentFullDetail(Number(studentId));
      const result = Helper.studentDetail(fullDetail);

      return { status: 200, data: result };
    }
    catch (error: any) { if (conn) await conn.rollback(); console.error(error); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  getOneClassroom(array: StudentClassroom[]): StudentClassroom {
    const index: number = array.findIndex((sc: StudentClassroom): boolean => getTimeZone(sc.endedAt) === Math.max(...array.map((sc: StudentClassroom) => getTimeZone(sc.endedAt))));
    return array[index];
  }

  normalizeString(str: string): string {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()
      .trim()
  }

  levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // remoção
            dp[i][j - 1],     // inserção
            dp[i - 1][j - 1]  // substituição
          )
        }
      }
    }

    return dp[m][n]
  }

  isSimilar(a: string, b: string, threshold = 0.8): boolean {
    const normA = this.normalizeString(a)
    const normB = this.normalizeString(b)

    const maxLength = Math.max(normA.length, normB.length)
    if (maxLength === 0) return true // strings vazias = iguais

    const dist = this.levenshtein(normA, normB)
    const similarity = 1 - dist / maxLength

    return similarity >= threshold
  }

}

export const stController = new StudentController();
