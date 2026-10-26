import { connectionPool } from "../services/db";
import { StudentClassroom } from "../model/StudentClassroom";
import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Student } from "../model/Student";
import { PER_CAT as pc } from "../utils/enums";
import { InactiveNewClassroom, UserInterface, JwtPayload } from "../interfaces/interfaces";
import { Request } from "express";
import { HttpError } from "../utils/helpers";
import getTimeZone from "../utils/getTimeZone";
import { yearRepository } from "../repositories/year.repository";
import { catalogRepository } from "../repositories/catalog.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { teacherClassDisciplineRepository } from "../repositories/teacher-class-discipline.repository";
import { studentRepository } from "../repositories/student.repository";
import { StudentFormatter } from "../utils/formatters/student.formatter";

class StudentController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async studentForm(request: Request, authUser: JwtPayload) {

    if (authUser.category === pc.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    try {
      const qUt = await teacherRepository.qTeacherByUser(authUser.user)
      const masterUser = qUt.person.category.id === pc.ADMN || qUt.person.category.id === pc.SUPE || qUt.person.category.id === pc.FORM

      const states = await catalogRepository.qStates()
      const disabilities = await catalogRepository.qDisabilities()
      const teacherClassrooms = await teacherClassDisciplineRepository.qAllTClassTx(masterUser, qUt.id)

      return { status: 200, data: { disabilities, states, teacherClassrooms } };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getAllInactivates(request: Request, authUser: JwtPayload) {

    if (authUser.category === pc.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const limit = !isNaN(parseInt(request.query.limit as string)) ? parseInt(request.query.limit as string) : 100;
    const offset = !isNaN(parseInt(request.query.offset as string)) ? parseInt(request.query.offset as string) : 0;

    const rawSearch = (request.query.search as string) ?? "";
    const search = `%${rawSearch.trim()}%`;

    try {
      const currentYear = await yearRepository.qCurrentYear();

      if (!currentYear) {
        const message = "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema."
        return { status: 404, message }
      }

      const lastYearName = Number(currentYear.name) - 1;
      const lastYearDB = await yearRepository.qYearByName(String(lastYearName));

      if (!lastYearDB) {
        return { status: 404, message: `Não existe ano letivo anterior ou posterior a ${currentYear.name}.`}
      }

      const rows = await studentRepository.qGetAllInactivates(search, request.params.year, currentYear.id, lastYearDB.id, limit, offset)

      const preResult = StudentFormatter.inactivesMappedResult(rows)

      return { status: 200, data: preResult.map((student: any) => ({ ...student, studentClassrooms: this.getOneClassroom(student.studentClassrooms) })) };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async setInactiveNewClassroomList(body: { list: InactiveNewClassroom[] }, authUser: UserInterface) {

    try {
      const currentYear = await yearRepository.qCurrentYear();
      if (!currentYear) throw new HttpError(404, 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.');

      const lastYearName = Number(currentYear.name) - 1;
      const lastYearDB = await yearRepository.qYearByName(String(lastYearName));

      if (!lastYearDB) throw new HttpError(404, 'Não foi possível encontrar o ano letivo anterior.');

      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user);

      const everyGraduate = body.list.every((item: any) =>
        item.newClassroom.name === 'FORMANDO' &&
        item.newClassroom.school === 'PMI' &&
        item.oldClassroom.shortName.replace(/\D/g, '') === '9'
      );

      // ==========================================
      // FLUXO DE FORMANDOS (Mantido intacto)
      // ==========================================
      if (everyGraduate && body.list.length > 0) { await studentRepository.graduateStudentsBatchSQL({ list: body.list, user: qUserTeacher, year: lastYearDB }); return { status: 200, data: {} } }

      // =========================================
      // FLUXO REGULAR EM LOTE (Transação Única)
      // =========================================
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
    if (authUser.category === pc.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }
    try {
      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user)
      const teacherClasses = await teacherRepository.qTeacherClassrooms(authUser.user)
      const masterTeacher = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.SUPE_EI || qUserTeacher.person.category.id === pc.FORM
      const isSuperEI = qUserTeacher.person.category.id === pc.SUPE_EI

      const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
      const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

      const options = { search: req.query.search as string, year: req.params.year, teacherClasses, owner: req.query.owner as string }

      const studentsClassrooms = await studentRepository.studentsClassroomsNewImplementation(options, masterTeacher, isSuperEI, limit, offset);

      return { status: 200, data: studentsClassrooms }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneStudentById(req: Request, authUser: JwtPayload) {

    if (authUser.category === pc.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const { params } = req

    try {
      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user)

      const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM

      const teacherClasses = await teacherRepository.qTeacherClassrooms(authUser.user)

      const preStudent = await studentRepository.qStudentFullDetail(Number(params.id))

      if (!preStudent) { return { status: 404, message: "Registro não encontrado" } }

      const data = StudentFormatter.studentDetail(preStudent)

      if (teacherClasses.classrooms.length > 0 && !teacherClasses.classrooms.includes(data.classroom.id) && !masterUser ) { return { status: 403, message: "Você não tem permissão para acessar esse registro." } }
      return { status: 200, data }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async setFirstLevel(body: any, authUser: UserInterface) {
    try {

      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user)

      if([pc.MONI, pc.SECR].includes(qUserTeacher.person.category.id)) { return { status: 403, message: 'Você não tem permissão para modificar este registro.' } }

      await studentRepository.qSetFirstLevel(Number(body.student.id), Number(body.level.id), authUser.user)
      return { status: 200, data: { message: 'done' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  getOneClassroom(array: StudentClassroom[]): StudentClassroom {
    const index: number = array.findIndex((sc: StudentClassroom): boolean => getTimeZone(sc.endedAt) === Math.max(...array.map((sc: StudentClassroom) => getTimeZone(sc.endedAt))));
    return array[index];
  }

}

export const stController = new StudentController();
