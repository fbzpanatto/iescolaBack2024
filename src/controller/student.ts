import {StudentClassroom} from "../model/StudentClassroom";
import {GenericController} from "./genericController";
import {Brackets, EntityManager, EntityTarget, FindOneOptions, In, IsNull} from "typeorm";
import {Student} from "../model/Student";
import {AppDataSource} from "../data-source";
import {PersonCategory} from "../model/PersonCategory";
import {IS_OWNER, PERSON_CATEGORIES, TRANSFER_STATUS} from "../utils/enums";
import {StudentDisability} from "../model/StudentDisability";
import {Disability} from "../model/Disability";
import {State} from "../model/State";
import {
  GraduateBody,
  InactiveNewClassroom,
  SaveStudent,
  StudentClassroomFnOptions,
  StudentClassroomReturn,
  UserInterface
} from "../interfaces/interfaces";
import {Person} from "../model/Person";
import {Request} from "express";
import {Classroom} from "../model/Classroom";
import {Transfer} from "../model/Transfer";
import {TransferStatus} from "../model/TransferStatus";
import {Year} from "../model/Year";
import {stateController} from "./state";
import {teacherClassroomsController} from "./teacherClassrooms";
import {Teacher} from "../model/Teacher";
import {isJSON} from "class-validator";
import getTimeZone from "../utils/getTimeZone";
import {Helper} from "../utils/helpers";
import {connectionPool} from "../services/db";

class StudentController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async studentForm(req: Request) {

    try {
      return await AppDataSource.transaction(async(CONN) => {
        const states = (await stateController.findAllWhere({}, req, CONN)).data;
        const disabilities = await CONN.find(Disability, { order: { official: 'DESC', name: "ASC" }})
        const teacherClassrooms = (await teacherClassroomsController.getAllTClass(req, CONN)).data;
        return { status: 200, data: { disabilities, states, teacherClassrooms } };
      })
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

  async setInactiveNewClassroomList(body: { list: InactiveNewClassroom[], user: UserInterface }) {
    try {

      const currentYear = await this.qCurrentYear()
      if (!currentYear) { return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' } }

      const lastYearName = Number(currentYear.name) - 1
      const lastYearDB = await this.qYearByName(String(lastYearName))

      if (!lastYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo anterior.' } }

      const qUserTeacher = await this.qTeacherByUser(body.user.user)

      const everyGraduate = body.list.every((item: any) =>
        item.newClassroom.name === 'FORMANDO' &&
        item.newClassroom.school === 'PMI' &&
        item.oldClassroom.shortName.replace(/\D/g, '') === '9'
      )

      if(everyGraduate && body.list.length > 0) {
        await this.graduateStudentsBatchSQL({list: body.list, user: qUserTeacher, year: lastYearDB })
      }
      else {
        for(let item of body.list) {
          const oldYearDB = await this.qYearById(item.oldYear)
          if (!oldYearDB) { throw new Error(JSON.stringify({ status: 404, message: 'Não foi possível encontrar o ano letivo informado.' }))}

          const el = await this.qActiveSc(item.student.id)
          if (el) { throw new Error(JSON.stringify({ status: 400, message: `O aluno ${el?.personName} está matriculado na sala ${el?.classroomName} ${el?.schoolName} em ${el?.yearName}. Solicite sua transferência através do menu Matrículas Ativas` }))}

          const result = await this.qLastRegister(item.student.id, lastYearDB.id)
          if (result && result.length > 1 && Number(currentYear.name) - Number(oldYearDB.name) > 1) { throw new Error(JSON.stringify({ status: 409, message: `O aluno ${item.student.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.` }))}

          const classroom = await this.qClassroom(item.newClassroom.id)
          const oldClassInDb = await this.qClassroom(item.oldClassroom.id)

          if (Number(classroom.name.replace(/\D/g, '')) < Number(oldClassInDb.name.replace(/\D/g, ''))) { throw new Error(JSON.stringify({ status: 400, message: 'Regressão de sala não é permitido.' }))}

          const newStudentResult = await this.qNewStudentClassroom(item.student.id, classroom.id, currentYear.id, qUserTeacher.person.user.id, item.rosterNumber)

          const newTransfer = await this.qNewTransfer(qUserTeacher.person.user.id, classroom.id, oldClassInDb.id, qUserTeacher.person.user.id, item.student.id, currentYear.id, qUserTeacher.person.user.id)

          if(newTransfer.affectedRows !== 1 && newStudentResult.affectedRows !== 1) { throw new Error(JSON.stringify({ status: 400, message: 'Algum aluno selecionado está' + ' impedindo esta operação. Tente realizar a passagem de forma individual afim de detectar' + ' qual não é possível.' })) }
        }
      }
      return { status: 200, data: {} };
    }
    catch (error: any) {
      if(!isJSON(error.message)) { return { status: 500, message: error.message } }
      const parsedError = JSON.parse(error.message) as { status: number; message: string }
      return { status: parsedError.status, message: parsedError.message }
    }
  }

  async setInactiveNewClassroom(body: InactiveNewClassroom) {

    // TODO: implementar verificação se há mudança de sala para o mesmo classroomNumber e mesmo ano.

    const { student, oldYear, newClassroom, oldClassroom } = body

    try {
      return await AppDataSource.transaction(async(CONN)=> {
        const currentYear = await this.qCurrentYear()
        if (!currentYear) { return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' } }

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const activeSc = await CONN.findOne(StudentClassroom, {
          relations: ['classroom.school', 'student.person', 'year'], where: { student: { id: student.id }, endedAt: IsNull() }
        }) as StudentClassroom

        if (activeSc) {
          return { status: 409, message: `O aluno ${activeSc.student.person.name} está matriculado na sala ${activeSc.classroom.shortName} ${activeSc.classroom.school.shortName} em ${activeSc.year.name}. Solicite sua transferência através do menu Matrículas Ativas` }
        }

        const lastYearName = Number(currentYear.name) - 1
        const lastYearDB = await CONN.findOne(Year,{ where: { name: lastYearName.toString() } }) as Year
        const oldYearDB = await CONN.findOne(Year,{ where: { id: oldYear } }) as Year

        if (!lastYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo anterior.' } }
        if (!oldYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo informado.' } }

        const lastRegister: Student | null = await CONN.getRepository(Student)
          .createQueryBuilder('student')
          .leftJoinAndSelect('student.person', 'person')
          .leftJoinAndSelect('student.state', 'state')
          .leftJoinAndSelect('student.studentClassrooms', 'studentClassroom')
          .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
          .leftJoinAndSelect('classroom.school', 'school')
          .leftJoinAndSelect('studentClassroom.year', 'year')
          .where('studentClassroom.endedAt IS NOT NULL')
          .andWhere('student.id = :studentId', { studentId: student.id })
          .andWhere('year.id = :yearId', { yearId: lastYearDB.id })
          .andWhere(qb => {
            const subQueryMaxEndedAt = qb
              .subQuery()
              .select('MAX(sc2.endedAt)')
              .from('student_classroom', 'sc2')
              .where('sc2.studentId = student.id')
              .andWhere('sc2.yearId = :yearId', { yearId: lastYearDB.id })
              .getQuery();

            return `studentClassroom.endedAt = (${subQueryMaxEndedAt})`;
          })
          .getOne();

        if (lastRegister && lastRegister?.studentClassrooms.length > 0 && Number(currentYear.name) - Number(oldYearDB.name) > 1) { return { status: 409, message: `O aluno ${lastRegister.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.` } }

        const classroom = await CONN.findOne(Classroom, { where: { id: newClassroom.id } }) as Classroom
        const oldClassInDb = await CONN.findOne(Classroom, { where: { id: oldClassroom.id } }) as Classroom

        const outsidersClassrooms = [1216, 1217, 1218]

        if(!outsidersClassrooms.includes(classroom.id)) {
          if (Number(classroom.name.replace(/\D/g, '')) < Number(oldClassInDb.name.replace(/\D/g, ''))) { return { status: 400, message: 'Regressão de sala não é permitido.' } }
        }

        const newStudentClassroom = await CONN.save(StudentClassroom, {
          student: student,
          classroom: classroom,
          year: currentYear,
          rosterNumber: 99,
          startedAt: new Date(),
          createdByUser: qUserTeacher.person.user.id
        }) as StudentClassroom

        await AppDataSource.getRepository(Transfer).save({
          startedAt: new Date(),
          endedAt: new Date(),
          requester: qUserTeacher,
          requestedClassroom: classroom,
          currentClassroom: oldClassInDb,
          receiver: qUserTeacher,
          student: student,
          status: await CONN.findOne(TransferStatus, { where: { id: 1, name: 'Aceitada' } }) as TransferStatus,
          year: currentYear,
          createdByUser: qUserTeacher.person.user.id
        })
        return { status: 200, data: newStudentClassroom };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async allStudents(req: Request<{ year: string }>) {
    try {

      const qUserTeacher = await this.qTeacherByUser(req.body.user.user)
      const teacherClasses = await this.qTeacherClassrooms(req?.body.user.user)
      const masterTeacher = qUserTeacher.person.category.id === PERSON_CATEGORIES.ADMN || qUserTeacher.person.category.id === PERSON_CATEGORIES.SUPE || qUserTeacher.person.category.id === PERSON_CATEGORIES.FORM

      const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
      const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

      const options = { search: req.query.search as string, year: req.params.year, teacherClasses, owner: req.query.owner as string }

      const studentsClassrooms = await this.studentsClassroomsNewImplementation(options, masterTeacher, limit, offset);

      return { status: 200, data: studentsClassrooms }

    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneStudentById(req: Request) {

    const { params, body } = req

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const options = { relations: ["person.category"], where: { person: { user: { id: body?.user.user } } } }
        const uTeacher = await CONN.findOne(Teacher, {...options})

        const masterUser = uTeacher?.person.category.id === PERSON_CATEGORIES.ADMN || uTeacher?.person.category.id === PERSON_CATEGORIES.SUPE || uTeacher?.person.category.id === PERSON_CATEGORIES.FORM

        const teacherClasses = await this.qTeacherClassrooms(req?.body.user.user)

        const preStudent = await this.student(Number(params.id), CONN)

        if (!preStudent) { return { status: 404, message: "Registro não encontrado" } }

        const data = this.studentResponse(preStudent)

        if (teacherClasses.classrooms.length > 0 && !teacherClasses.classrooms.includes(data.classroom.id) && !masterUser ) { return { status: 403, message: "Você não tem permissão para acessar esse registro." } }
        return { status: 200, data }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: SaveStudent) {
    const rosterNumber = parseInt(body.rosterNumber, 10);
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const qUserTeacher = await this.qTeacherByUser(body.user.user);
      const tClasses = await this.qTeacherClassrooms(body.user.user);
      const qCurrentYear = await this.qCurrentYear();
      const state = await this.qState(body.state) as State;
      const classroom = await this.qClassroom(body.classroom);

      // ==========================================
      // DATA SEGURA: Extrai apenas "YYYY-MM-DD"
      // ==========================================
      const safeBirthDate = (body.birth as any).split('T')[0];
      console.log('safeBirthDate', safeBirthDate)

      // Busca das Deficiências
      let disabilities: any[] = [];
      if (body.disabilities && body.disabilities.length > 0) {
        const placeholders = body.disabilities.map(() => '?').join(',');
        const [disRows] = await conn.query(`SELECT id, name, official FROM disability WHERE id IN (${placeholders})`, body.disabilities);
        disabilities = disRows as any[];
      }

      // Busca da Categoria de Aluno
      const [categoryRows] = await conn.query(`SELECT id, name, active FROM person_category WHERE id = ? LIMIT 1`, [PERSON_CATEGORIES.ALUN]);
      const category = (categoryRows as any[])[0];
      if (!category) { await conn.rollback(); return { status: 500, message: "Erro interno: Categoria de aluno não encontrada no sistema." } }

      // Monta o objeto base de Pessoa com a data segura
      const personData: any = {
        name: body.name.toUpperCase().trim(),
        birth: safeBirthDate, // Utilizando a data fatiada aqui
        category: category
      };

      if (!qCurrentYear) { await conn.rollback(); return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." } }

      // ==========================================
      // BUSCA 1: CHECAGEM DE POTENCIAIS DUPLICATAS
      // ==========================================
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
        if (!potentialDuplicatesMap.has(row.s_id)) {
          potentialDuplicatesMap.set(row.s_id, {
            ra: row.s_ra, dv: row.s_dv,
            person: { name: row.p_name, birth: row.p_birth },
            studentClassrooms: []
          });
        }
        if (row.sc_id) {
          potentialDuplicatesMap.get(row.s_id).studentClassrooms.push({
            endedAt: row.sc_endedAt,
            classroom: { shortName: row.c_shortName, school: { shortName: row.sch_shortName } },
            year: { name: row.y_name }
          });
        }
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

            if (activeRecord) {
              lastRecord = activeRecord;
            } else if (existing.studentClassrooms.length > 0) {
              lastRecord = existing.studentClassrooms.reduce((prev: any, current: any) => {
                const prevDate = prev.endedAt ? new Date(prev.endedAt).getTime() : 0;
                const currDate = current.endedAt ? new Date(current.endedAt).getTime() : 0;
                return currDate > prevDate ? current : prev;
              });
            }

            await conn.rollback();
            return {
              status: 409,
              message: `⚠️ ALUNO JÁ CADASTRADO!\n\nJá existe um aluno com os mesmos dados:\n\nNome: ${existing.person.name}\nData de Nascimento: ${new Date(existing.person.birth).toLocaleDateString('pt-BR')}\nRA Existente: ${existing.ra}-${existing.dv}\nRA Tentado: ${body.ra}-${body.dv}\n\n${lastRecord ? `Último registro: ${lastRecord.classroom.shortName} - ${lastRecord.classroom.school.shortName} (${lastRecord.year.name})\n${activeRecord ? `\n⚠️ Este aluno está ATIVO nesta sala. Use o menu MATRÍCULAS ATIVAS para transferência.` : `\n⚠️ Use o menu PASSAR DE ANO no ano ${lastRecord.year.name} para reativar este aluno.`}` : ''}\n\nSe você tem certeza de que são pessoas diferentes, solicite ao Administrador do sistema.`
            };
          }
        }
      }

      // ==========================================
      // BUSCA 2: RAs NA MESMA FAIXA
      // ==========================================
      const raNumerico = parseInt(body.ra);
      const raBase = Math.floor(raNumerico / 100) * 100;

      const sqlSameRange = `
        SELECT s.ra AS s_ra, s.dv AS s_dv, p.name AS p_name, p.birth AS p_birth
        FROM student s
        LEFT JOIN person p ON s.personId = p.id
        WHERE CAST(s.ra AS UNSIGNED) BETWEEN ? AND ? AND s.ra != ?`;

      const [rowsSameRange] = await conn.query(sqlSameRange, [raBase, raBase + 99, body.ra]);

      const studentsSameRARange = (rowsSameRange as any[]).map(r => ({
        ra: r.s_ra, dv: r.s_dv, person: { name: r.p_name, birth: r.p_birth }
      }));

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
            return {
              status: 409,
              message: `⚠️ POSSÍVEL DUPLICATA DETECTADA!\n\nFoi encontrado um aluno com dados similares:\n\n• Existente: ${existing.person.name} (RA: ${existing.ra}-${existing.dv} | Nasc: ${birthExisting.toLocaleDateString('pt-BR', { timeZone: 'UTC' })})\n• Novo: ${body.name} (RA: ${body.ra}-${body.dv} | Nasc: ${displayBirthNew})\n\nMotivo: RAs na mesma faixa (${raBase} a ${raBase + 99}).\n\nVerifique se não é o mesmo aluno. Em caso de dúvida, consulte o Administrador.`
            };
          }
        }
      }

      // ==========================================
      // BUSCA 3: CHECAGEM SIMPLES PRE-EXISTS
      // ==========================================
      const sqlPreExists = `
      SELECT s.ra AS s_ra, p.name AS p_name, p.birth AS p_birth
      FROM student s
      LEFT JOIN person p ON s.personId = p.id
      WHERE s.ra = ? LIMIT 1`;
      const [rowsPreExists] = await conn.query(sqlPreExists, [body.ra]);
      const preExistsRow = (rowsPreExists as any[])[0];

      if (preExistsRow) {
        const formattedDate = new Date(preExistsRow.p_birth).toISOString().slice(0, 10);
        const sameBirthDate = formattedDate === safeBirthDate; // Comparação direta com a data fatiada

        if (this.isSimilar(preExistsRow.p_name, body.name) && sameBirthDate) {
          await conn.rollback();
          return { status: 409, message: `Existe um aluno com dados semelhantes ao qual está tentando cadastrar. ${preExistsRow.p_name}, RA ${preExistsRow.s_ra} e nascimento ${ safeBirthDate }. Comunique ao Administrador do sistema.` };
        }
      }

      // ==========================================
      // BUSCA 4: CHECAGEM EXATA DE RA e DV
      // ==========================================
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
          const el: any = {
            active: typedRowsEl[0].s_active, person: { name: typedRowsEl[0].p_name }, studentClassrooms: []
          };
          for (const row of typedRowsEl) {
            if (row.sc_id) {
              el.studentClassrooms.push({
                endedAt: row.sc_endedAt,
                classroom: { shortName: row.c_shortName, school: { shortName: row.sch_shortName } },
                year: { name: row.y_name }
              });
            }
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
      if (body.user.category === PERSON_CATEGORIES.PROF) { if (!tClasses.classrooms.includes(classroom.id)) { await conn.rollback(); return { status: 403, message } } }

      // ==========================================
      // FASE DE ESCRITA
      // ==========================================

      // Formatação do DV
      let formatedDv;
      const digit = body.dv.replace(/\D/g, "");
      if (digit.length) { formatedDv = body.dv; }
      else { formatedDv = body.dv.toUpperCase(); }

      // 1. Inserir Person
      const [resultPerson]: any = await conn.query(
        `INSERT INTO person (name, birth, categoryId) VALUES (?, ?, ?)`,
        [personData.name, personData.birth, personData.category.id]
      );
      personData.id = resultPerson.insertId;

      // 2. Inserir Student (com observações)
      const [resultStudent]: any = await conn.query(
        `INSERT INTO student (ra, dv, active, personId, stateId, observationOne, observationTwo, createdByUser, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          body.ra,
          formatedDv,
          true, // default active
          personData.id,
          state.id,
          body.observationOne,
          body.observationTwo,
          qUserTeacher.person.user.id
        ]
      );

      // Constrói o objeto do estudante final para retorno e relacionamentos
      const studentData: any = {
        id: resultStudent.insertId,
        person: personData,
        ra: body.ra,
        dv: formatedDv,
        state: state,
        observationOne: body.observationOne,
        observationTwo: body.observationTwo,
        active: true,
        createdByUser: qUserTeacher.person.user.id,
        createdAt: new Date()
      };

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

      // Retorna o objeto mockado como tipo Student para o front-end
      return { status: 201, data: studentData as unknown as Student };
    }
    catch (error: any) {
      if (conn) await conn.rollback();
      console.error(error);
      return { status: 500, message: error.message }
    }
    finally {
      if (conn) conn.release()
    }
  }

  async setFirstLevel(body: any) {
    try {

      const qUserTeacher = await this.qTeacherByUser(body.user.user)

      if([PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.SECR].includes(qUserTeacher.person.category.id)) { return { status: 403, message: 'Você não tem permissão para modificar este registro.' } }

      await this.qSetFirstLevel(Number(body.student.id), Number(body.level.id), Number(body.user.user))
      return { status: 200, data: { message: 'done' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(studentId: number | string, body: any) {
    try {
      let result: any;
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const dbStudentOptions: FindOneOptions<Student> = {
          relations: ["person", "studentDisabilities.disability", "state"], where: { id: Number(studentId) }
        }

        const dbStudent: Student = await CONN.findOne(Student, dbStudentOptions) as Student

        const bodyClass: Classroom | null = await CONN.findOne(Classroom, { where: { id: body.classroom } })

        const arrRel: string[] = ["student", "classroom", "year" ]

        const stClassroomOptions:  FindOneOptions<StudentClassroom> = {
          relations: arrRel, where: { id: Number(body.currentStudentClassroomId), student: { id: dbStudent.id }, endedAt: IsNull() }
        }

        const stClass: StudentClassroom | null = await CONN.findOne(StudentClassroom, {...stClassroomOptions})

        if (!dbStudent) { return { status: 404, message: "Registro não encontrado" } }
        if (!stClass) { return { status: 404, message: "Registro não encontrado" } }
        if (!bodyClass) { return { status: 404, message: "Sala não encontrada" } }

        const cBodySRA: string = `${body.ra}${body.dv}`;
        const databaseStudentRa = `${dbStudent.ra}${dbStudent.dv}`;

        if(databaseStudentRa !== cBodySRA && qUserTeacher.person.category.id != PERSON_CATEGORIES.ADMN) {
          return { status: 403, message: 'Você não tem permissão para modificar o RA de um aluno. Solicite ao Administrador do sistema.' }
        }

        if (databaseStudentRa !== cBodySRA) {
          const exists: Student | null = await CONN.findOne(Student, { where: { ra: body.ra, dv: body.dv } });
          if (exists) { return { status: 409, message: "Já existe um aluno com esse RA" } }
        }

        const canChange: number[] = [ PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.SECR ]

        const message: string = "Você não tem permissão para alterar a sala de um aluno por aqui. Solicite a alguém com nível de acesso superior ao seu."
        if (!canChange.includes(qUserTeacher.person.category.id) && stClass?.classroom.id != bodyClass.id ) { return { status: 403, message } }

        const currentYear: Year = (await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } })) as Year

        const pedTransOptions:  FindOneOptions<Transfer> = {
          relations: ['requester.person', 'requestedClassroom.school'],
          where: {
            student: { id: stClass.student.id },
            currentClassroom: { id: stClass.classroom.id },
            status: { id: TRANSFER_STATUS.PENDING }, year: { id: currentYear.id }, endedAt: IsNull()
          }
        }

        const pendingTransfer: Transfer | null = await CONN.findOne(Transfer, pedTransOptions)

        if(pendingTransfer) { return { status: 403, message: `Existe um pedido de transferência ativo feito por: ${ pendingTransfer.requester.person.name } para a sala: ${ pendingTransfer.requestedClassroom.shortName } - ${ pendingTransfer.requestedClassroom.school.shortName }` } }

        if (stClass?.classroom.id != bodyClass.id && canChange.includes(qUserTeacher.person.category.id)) {

          const newNumber: number = Number(bodyClass.shortName.replace(/\D/g, ""))
          const oldNumber: number  = Number(stClass.classroom.shortName.replace(/\D/g, ""))

          if(!isNaN(newNumber) && !isNaN(oldNumber) && ![1216, 1217, 1218].includes(bodyClass.id)) {
            if (newNumber < oldNumber) { return { status: 404, message: 'Regressão de sala não é permitido.' }}
          }

          await CONN.save(StudentClassroom, { ...stClass, endedAt: new Date(), updatedByUser: qUserTeacher.person.user.id });

          const lastRosterNumber = await CONN.find(StudentClassroom, { relations: ["classroom", "year"], where: { year: { id: currentYear.id }, classroom: { id: bodyClass.id } }, order: { rosterNumber: "DESC" }, take: 1 });

          let last = 1; if (lastRosterNumber[0]?.rosterNumber) { last = lastRosterNumber[0].rosterNumber + 1 }

          await CONN.save(StudentClassroom, { student: dbStudent, classroom: bodyClass, year: currentYear, rosterNumber: last, startedAt: new Date(), createdByUser: qUserTeacher.person.user.id });

          const notDigit = /\D/g; const classNumber = Number( bodyClass.shortName.replace(notDigit, "") );

          const transfer = new Transfer();
          transfer.createdByUser = qUserTeacher.person.user.id;
          transfer.startedAt = new Date();
          transfer.endedAt = new Date();
          transfer.requester = qUserTeacher as Teacher;
          transfer.requestedClassroom = bodyClass;
          transfer.currentClassroom = stClass.classroom;
          transfer.receiver = qUserTeacher as Teacher;
          transfer.student = dbStudent;
          transfer.status = await CONN.findOne(TransferStatus, { where: { id: 1,name: "Aceitada" } }) as TransferStatus;
          transfer.year = await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } }) as Year;

          await CONN.save(Transfer, transfer);
        }

        if (stClass.classroom.id === bodyClass.id) { await CONN.save(StudentClassroom, {...stClass, rosterNumber: body.rosterNumber, createdAt: new Date(), createdByUser: qUserTeacher.person.user.id } as StudentClassroom )}

        dbStudent.ra = body.ra;
        dbStudent.dv = body.dv;
        dbStudent.updatedAt = new Date();
        dbStudent.updatedByUser = qUserTeacher.person.user.id;
        dbStudent.person.name = body.name.toUpperCase().trim();
        dbStudent.person.birth = body.birth;
        dbStudent.observationOne = body.observationOne;
        dbStudent.observationTwo = body.observationTwo;
        dbStudent.state = await CONN.findOne(State, { where: { id: body.state } }) as State;

        const stDisabilities = dbStudent.studentDisabilities.filter((studentDisability) => !studentDisability.endedAt);

        await this.setDisabilities(qUserTeacher.person.user.id, await CONN.save(Student, dbStudent), stDisabilities, body.disabilities, CONN);

        result = this.studentResponse(await this.student(Number(studentId), CONN));

        return { status: 200, data: result };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async setDisabilities(uTeacherId:number, student: Student, studentDisabilities: StudentDisability[], body: number[], CONN: EntityManager ) {
    const currentDisabilities = studentDisabilities.map((studentDisability) => studentDisability.disability.id);

    const create = body.filter((disabilityId) => !currentDisabilities.includes(disabilityId));

    if (create.length) {
      const disabilities = create.map((disabilityId) => { return { createdByUser: uTeacherId, student, disability: { id: disabilityId }, startedAt: new Date() } as StudentDisability });
      await CONN.save(StudentDisability, disabilities);
    }

    const remove = currentDisabilities.filter((disabilityId) => !body.includes(disabilityId));

    if (remove.length) {
      for (let item of remove) {
        const studentDisability = studentDisabilities.find((studentDisability) => studentDisability.disability.id === item);
        if (studentDisability) {
          studentDisability.endedAt = new Date();
          studentDisability.updatedByUser = uTeacherId
          await CONN.save(StudentDisability, studentDisability);
        }
      }
    }
  }

  async studentCategory(CONN?: EntityManager) {
    if(!CONN){ return (await AppDataSource.getRepository(PersonCategory).findOne({ where: { id: PERSON_CATEGORIES.ALUN } })) as PersonCategory }
    return await CONN.findOne(PersonCategory, { where: { id: PERSON_CATEGORIES.ALUN } }) as PersonCategory
  }

  async disabilities(ids: number[], CONN?: EntityManager) {
    if(!CONN) { return await AppDataSource.getRepository(Disability).findBy({ id: In(ids) }) }
    return await CONN.findBy(Disability, { id: In(ids) })
  }

  async student(studentId: number, CONN: EntityManager) {
    return await CONN
      .createQueryBuilder()
      .select(["student.id", "student.ra", "student.dv", "student.observationOne", "student.observationTwo", "state.id", "state.acronym", "person.id", "person.name", "person.birth", "studentClassroom.id", "studentClassroom.rosterNumber", "studentClassroom.startedAt", "studentClassroom.endedAt", "classroom.id", "classroom.shortName", "school.id", "school.shortName", "GROUP_CONCAT(DISTINCT disability.id ORDER BY disability.id ASC) AS disabilities"])
      .from(Student, "student")
      .leftJoin("student.person", "person")
      .leftJoin("student.studentDisabilities","studentDisabilities","studentDisabilities.endedAt IS NULL")
      .leftJoin("studentDisabilities.disability", "disability")
      .leftJoin("student.state", "state")
      .leftJoin("student.studentClassrooms","studentClassroom","studentClassroom.endedAt IS NULL")
      .leftJoin("studentClassroom.classroom", "classroom")
      .leftJoin("classroom.school", "school")
      .where("student.id = :studentId", { studentId })
      .groupBy("studentClassroom.id")
      .getRawOne();
  }

  studentResponse(student: any) {
    return {
      id: student.studentClassroom_id,
      rosterNumber: student.studentClassroom_rosterNumber,
      startedAt: student.studentClassroom_startedAt,
      endedAt: student.studentClassroom_endedAt,
      student: {
        id: student.student_id,
        ra: student.student_ra,
        dv: student.student_dv,
        observationOne: student.student_observationOne,
        observationTwo: student.student_observationTwo,
        state: {
          id: student.state_id,
          acronym: student.state_acronym,
        },
        person: {
          id: student.person_id,
          name: student.person_name,
          birth: student.person_birth,
        },
        disabilities:
          student.disabilities
            ?.split(",")
            .map((disabilityId: string) => Number(disabilityId)) ?? [],
      },
      classroom: {
        id: student.classroom_id,
        shortName: student.classroom_shortName,
        school: {
          id: student.school_id,
          shortName: student.school_shortName,
        },
      },
    };
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

  async graduate( studentId: number | string, body: GraduateBody ) {
    try {

      let student: Student | null = null

      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const masterUser: boolean = qUserTeacher.person.category.id === PERSON_CATEGORIES.ADMN || qUserTeacher.person.category.id === PERSON_CATEGORIES.SUPE || qUserTeacher.person.category.id === PERSON_CATEGORIES.FORM;

        const { classrooms } = await this.qTeacherClassrooms(body.user.user)

        const message = "Você não tem permissão para realizar modificações nesta sala de aula."
        if (!classrooms.includes(Number(body.student.classroom.id)) && !masterUser) { return { status: 403, message } }

        student = await CONN.findOne(Student, { where: { id: Number(studentId) } }) as Student

        if (!student) { return { status: 404, message: "Registro não encontrado" } }

        student.active = body.student.active; student.updatedAt = new Date(); student.updatedByUser = qUserTeacher.person.user.id;

        await CONN.save(Student, student)

        const status: TransferStatus = await CONN.findOne(TransferStatus, { where: { id: 6, name: "Formado" } }) as TransferStatus
        const year: Year = await CONN.findOne(Year, { where: { id: body.year } }) as Year
        const entity = { status, year, student, receiver: qUserTeacher, createdByUser: qUserTeacher.person.user.id, updatedByUser: qUserTeacher.person.user.id, startedAt: new Date(), endedAt: new Date(), requester: qUserTeacher, requestedClassroom: body.student.classroom, currentClassroom: body.student.classroom  }
        const transferResponse = await CONN.save(Transfer, entity)

        return { status: 201, data: transferResponse };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const stController = new StudentController();
