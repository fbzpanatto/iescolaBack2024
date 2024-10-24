import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { classroomController } from "./classroom";
import { AppDataSource } from "../data-source";
import { Period } from "../model/Period";
import { Classroom } from "../model/Classroom";
import { StudentClassroom } from "../model/StudentClassroom";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import { QuestionGroup } from "../model/QuestionGroup";
import { StudentQuestion } from "../model/StudentQuestion";
import { StudentTestStatus } from "../model/StudentTestStatus";
import { pc } from "../utils/personCategories";
import { Year } from "../model/Year";
import { Brackets, EntityManager, EntityTarget, ObjectLiteral } from "typeorm";
import { Teacher } from "../model/Teacher";
import { Question } from "../model/Question";
import { Descriptor } from "../model/Descriptor";
import { Topic } from "../model/Topic";
import { ClassroomCategory } from "../model/ClassroomCategory";
import { Discipline } from "../model/Discipline";
import { Bimester } from "../model/Bimester";
import { TestCategory } from "../model/TestCategory";
import { ReadingFluencyGroup } from "../model/ReadingFluencyGroup";
import { ReadingFluency } from "../model/ReadingFluency";
import { TEST_CATEGORIES_IDS } from "../utils/testCategory";
import { TestBodySave } from "../interfaces/interfaces";
import { TestClassroom } from "../model/TestClassroom";
import { AlphabeticLevel } from "../model/AlphabeticLevel";
import { Alphabetic } from "../model/Alphabetic";
import { School } from "../model/School";
import { Disability } from "../model/Disability";

interface Totals { id: number, tNumber: number, tTotal: number, tRate: number }
interface insertStudentsBody { user: ObjectLiteral, studentClassrooms: number[], test: { id: number  }, year: number, classroom: { id: number }}
interface notIncludedInterface { id: number, rosterNumber: number, startedAt: Date, endedAt: Date, name: string, ra: number, dv: number }
interface ReadingHeaders { exam_id: number, exam_name: string, exam_color: string, exam_levels: { level_id: number, level_name: string, level_color: string }[] }
export interface AlphaHeaders { id: number, name: string, periods: Period[], levels: AlphabeticLevel[], testQuestions?: { id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup, counter?: number, counterPercentage?: number }[] }
interface AllClassrooms { id: number, name: string, shortName: string, school: School, totals: { bimesterCounter: number, testQuestions: { counter: number, counterPercentage: number, id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup } | {}[] | undefined, levels: any[], id: number, name: string, periods: Period[] }[] }
interface CityHall { id: number, name: string, shortName: string, school: string, totals: { bimesterCounter: number, id: number, name: string, periods: Period[], levels: AlphabeticLevel[], testQuestions?: { id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup, counter?: number, counterPercentage?: number }[] }[] }


class TestController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async getFormData(req: Request) {

    try {
      return await AppDataSource.transaction(async (CONN) => {
        const classrooms = (await classroomController.getAllClassrooms(req, false, CONN)).data
        const disciplines = await CONN.find(Discipline)
        const bimesters = await CONN.find(Bimester)
        const testCategories = await CONN.find(TestCategory)
        const questionGroup = await CONN.findOneBy(QuestionGroup, { id: 1 });
        return { status: 200, data: { classrooms, disciplines, bimesters, testCategories, questionGroup } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getGraphic(req: Request) {

    const { id: testId, classroom: classroomId } = req.params
    const { year: yearId } = req.query

    try {

      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const teacher = await this.teacherByUser(req.body.user.user, CONN)
        const masterUser = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE || teacher.person.category.id === pc.FORM

        const baseTest = await CONN.findOne(Test, { where: { id: Number(testId) }, relations: ['category', 'discipline'] }) as Test

        const { classrooms} = await this.teacherClassrooms(req.body.user, CONN)
        if(!classrooms.includes(Number(classroomId)) && !masterUser) return { status: 403, message: "Você não tem permissão para acessar essa sala." }

        const baseClassroom = await CONN.findOne(Classroom, { where: { id: Number(classroomId) }, relations: ["school"] })
        if (!baseClassroom) return { status: 404, message: "Sala não encontrada" }

        switch (baseTest.category?.id) {
          case TEST_CATEGORIES_IDS.LITE_1:
          case TEST_CATEGORIES_IDS.LITE_2:
          case TEST_CATEGORIES_IDS.LITE_3: {

            const year = await CONN.findOne(Year, { where: { id: Number(yearId) } })
            if(!year) return { status: 404, message: "Ano não encontrado." }

            let headers = await this.alphaHeaders(year.name, CONN) as AlphaHeaders[]

            const tests = await this.alphabeticTests(year.name, baseTest, CONN)

            let testQuestionsIds: number[] = []

            if(baseTest.category?.id != TEST_CATEGORIES_IDS.LITE_1) {
              for(let test of tests) {

                const testQuestions = await this.getTestQuestions(
                  test.id, CONN, ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "questionGroup.id", "questionGroup.name"]
                )

                test.testQuestions = testQuestions
                testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ]
              }
            }

            headers = headers.map(bi => { return { ...bi, testQuestions: tests.find(test => test.period.bimester.id === bi.id)?.testQuestions } })

            let onlyClasses = (await this.alphaQuestions(year.name, baseTest, testQuestionsIds, CONN)).flatMap(school => school.classrooms).sort((a, b) => a.shortName.localeCompare(b.shortName))

            let classrooms;

            const cityHall = {
              id: 999,
              name: 'ITATIBA',
              shortName: 'ITA',
              school: 'ITATIBA',
              totals: headers.map(h => ({ ...h, bimesterCounter: 0 }))
            }

            if(TEST_CATEGORIES_IDS.LITE_1 === baseTest.category?.id) {

              classrooms = this.cityHallResponse(baseClassroom, onlyClasses).map((c) => {
                return { id: c.id, name: c.name, shortName: c.shortName, school: c.school, percent: this.alphaTotalizator(headers, c) }
              })

            }
            else {

              let allClassrooms = this.alphaAllClasses23(onlyClasses, headers)

              cityHall.totals = this.aggregateResult(cityHall, allClassrooms)

              classrooms = [ ...allClassrooms.filter(c => c.school.id === baseClassroom.school.id), cityHall ]
            }

            const test = {
              id: 99,
              name: baseTest.name,
              classrooms: [baseClassroom],
              category: { id: baseTest.category.id, name: baseTest.category.name },
              discipline: { name: baseTest.discipline.name },
              period: { bimester: { name: 'TODOS' }, year }
            }

            data = { alphabeticHeaders: headers, ...test, classrooms }
            break;
          }

          case TEST_CATEGORIES_IDS.READ_2:
          case TEST_CATEGORIES_IDS.READ_3: {

            const headers = await this.getReadingFluencyHeaders(CONN)
            const fluencyHeaders = this.readingFluencyHeaders(headers)

            const test = await this.getReadingFluencyForGraphic(testId, yearId as string, CONN) as Test

            let response= { ...test, fluencyHeaders }

            response.classrooms = this.cityHallResponse(baseClassroom, response.classrooms)

            data = {
              ...response,
              classrooms: response.classrooms.map((classroom: Classroom) => {
                return {
                  id: classroom.id,
                  name: classroom.name,
                  shortName: classroom.shortName,
                  school: classroom.school,
                  percent: this.readingFluencyTotalizator(headers, classroom)
                }
              })
            }

            break;
          }

          case TEST_CATEGORIES_IDS.AVL_ITA:
          case TEST_CATEGORIES_IDS.TEST_4_9: {

            const { test, testQuestions } = await this.getTestForGraphic(testId, yearId as string, CONN)

            const questionGroups = await this.getTestQuestionsGroups(Number(testId), CONN)
            if(!test) return { status: 404, message: "Teste não encontrado" }

            const classroomResults = test.classrooms
              .filter(classroom =>
                // Filtra as salas de aula com pelo menos um aluno com respostas
                classroom.studentClassrooms.some(sc =>
                  sc.student.studentQuestions.some(sq => sq.answer.length > 0)
                )
              )
              .map(classroom => {

                const studentCount = classroom.studentClassrooms.reduce((acc, item) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);

                const duplicatedStudents = classroom.studentClassrooms.filter(item => studentCount[item.student.id] > 1).map(d => d.endedAt ? { ...d, ignore: true } : d)

                const studentClassrooms = classroom.studentClassrooms
                  .map(item => { const duplicated = duplicatedStudents.find(d => d.id === item.id); return duplicated ? duplicated : item })

                const filtered = studentClassrooms.filter((sc: any) => {
                  return !sc.ignore && sc.student.studentQuestions.some((sq: any) => sq.answer.length > 0 && sq.rClassroom.id === classroom.id )
                });

                // Pré-calcula uma lista de perguntas dos alunos
                const filteredStudentQuestions = filtered.map(sc =>
                  sc.student.studentQuestions.filter(sq =>
                    sq.answer.length > 0 && sq.rClassroom?.id === classroom.id
                  )
                ).flat(); // Usamos flat diretamente após map para reduzir o uso de flatMap

                return {
                  id: classroom.id,
                  name: classroom.name,
                  shortName: classroom.shortName,
                  school: classroom.school.name,
                  schoolId: classroom.school.id,
                  totals: testQuestions.map(tQ => {

                    // Ignora perguntas inativas
                    if (!tQ.active) {
                      return { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 };
                    }

                    // Seleciona todas as questões dos alunos que correspondem à pergunta do teste
                    const studentsQuestions = filteredStudentQuestions.filter(sq =>
                      sq.testQuestion.id === tQ.id
                    );

                    // Filtra as questões que têm a resposta correta
                    const totalSq = studentsQuestions.filter(sq =>
                      tQ.answer?.includes(sq.answer.toUpperCase())
                    );

                    // Total de estudantes e perguntas respondidas corretamente
                    const total = filtered.length;
                    const matchedQuestions = totalSq.length;

                    // Calcula a taxa de correspondência
                    const tRate = matchedQuestions > 0 ? Math.floor((matchedQuestions / total) * 10000) / 100 : 0;

                    return { id: tQ.id, order: tQ.order, tNumber: matchedQuestions, tPercent: total, tRate };
                  })
                };
              });

            const classroomNumber = baseClassroom.shortName.replace(/\D/g, "");
            const schoolResults = classroomResults.filter(cl => cl.schoolId === baseClassroom.school.id && cl.shortName.replace(/\D/g, "") === classroomNumber)

            let allResults: { id: number, order: number, tNumber: number | string, tPercent: number | string, tRate: number | string }[] = []
            const totalClassroomsResults = classroomResults.flatMap(el => el.totals)

            // Inicializar o Map para acessar elementos por ID de maneira rápida
            const resultsMap = new Map();

            // Preencher o Map com os resultados já existentes
            for (let el of allResults) {
              resultsMap.set(el.id, el);
            }

            for (let item of totalClassroomsResults) {
              const el = resultsMap.get(item.id);

              if (!el) {
                // Se não existir no Map, adicionar um novo elemento
                const newElement = {
                  id: item.id,
                  order: item.order,
                  tNumber: Number(item.tNumber),
                  tPercent: Number(item.tPercent),
                  tRate: Number(item.tRate)
                };
                allResults.push(newElement);
                resultsMap.set(item.id, newElement); // Adicionar ao Map para futuras referências
              } else {
                // Se já existir, atualizar os valores
                el.tNumber += Number(item.tNumber);
                el.tPercent += Number(item.tPercent);
                el.tRate = Math.floor((el.tNumber / el.tPercent) * 10000) / 100;
              }
            }

            const cityHall = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: 'ITATIBA', totals: allResults }

            data = { ...test, testQuestions, questionGroups, classrooms: [...schoolResults.sort((a, b) => a.shortName.localeCompare(b.shortName)), cityHall] }
            break;
          }
        }
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getStudents(request?: Request) {

    const testId = parseInt(request?.params.id as string)

    const classroomId = parseInt(request?.params.classroom as string)

    const yearName = request?.params.year as string

    try {
      return await AppDataSource.transaction(async (CONN) => {

        const testClassroom = await CONN.findOne(TestClassroom, { where: { testId, classroomId } })
        if(!testClassroom) { return { status: 404, message: 'Esse teste não existe para a sala em questão.' } }

        const uTeacher = await this.teacherByUser(request?.body.user.user, CONN)
        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE || uTeacher.person.category.id === pc.FORM;

        const { classrooms } = await this.teacherClassrooms(request?.body.user, CONN)
        if(!classrooms.includes(classroomId) && !masterUser) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

        const test = await this.getTest(testId, yearName, CONN)
        if(!test) return { status: 404, message: "Teste não encontrado" }

        const classroom = await CONN.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .where("classroom.id = :classroomId", { classroomId })
          .getOne();

        if(!classroom) return { status: 404, message: "Sala não encontrada" }

        let data;

        switch (test.category.id) {
          case(TEST_CATEGORIES_IDS.LITE_1):
          case(TEST_CATEGORIES_IDS.LITE_2):
          case(TEST_CATEGORIES_IDS.LITE_3): {

            const studentsBeforeSet = await this.studentClassroomsAlphabetic(test, Number(classroomId), (yearName as string), CONN)
            const alphabeticHeaders = await this.alphaHeaders(yearName, CONN)

            switch (test.category.id) {
              case(TEST_CATEGORIES_IDS.LITE_1): {
                data = await this.alphabeticTest(false, alphabeticHeaders, test, studentsBeforeSet, classroom, classroomId, uTeacher, yearName, CONN)
                break;
              }
              case(TEST_CATEGORIES_IDS.LITE_2):
              case(TEST_CATEGORIES_IDS.LITE_3): {
                data = await this.alphabeticTest(true, alphabeticHeaders, test, studentsBeforeSet, classroom, classroomId, uTeacher, yearName, CONN)
                break;
              }
            }
            break;
          }

          case(TEST_CATEGORIES_IDS.READ_2):
          case(TEST_CATEGORIES_IDS.READ_3): {

            const headers = await this.getReadingFluencyHeaders(CONN)
            const fluencyHeaders = this.readingFluencyHeaders(headers)

            const preStudents = await this.stuClassReadF(test, Number(classroomId), (yearName as string), CONN)

            await this.linkReading(headers, preStudents, test, uTeacher.person.user.id, CONN)

            let studentClassrooms = await this.getReadingFluencyStudents(test, classroomId, yearName, CONN )

            studentClassrooms = studentClassrooms.map((item: any) => {

              item.student.readingFluency = item.student.readingFluency.map((readingFluency: ReadingFluency) => {
                if(item.endedAt && readingFluency.rClassroom?.id && readingFluency.rClassroom.id != classroomId) { return { ...readingFluency, gray: true } }

                if(!item.endedAt && readingFluency.rClassroom?.id && readingFluency.rClassroom.id != classroomId) { return { ...readingFluency, gray: true } }

                if(readingFluency.rClassroom?.id && readingFluency.rClassroom.id != classroomId) { return { ...readingFluency, gray: true } }
                return readingFluency
              })

              return item
            })

            for(let item of studentClassrooms) {
              for(let el of item.student.studentDisabilities) {
                const options = { where: { studentDisabilities: el } }
                el.disability = await CONN.findOne(Disability, options) as Disability
              }
            }

            const totalNuColumn = []

            const allFluencies = studentClassrooms
              .filter((el: any) => !el.ignore)
              .flatMap((el: any) => el.student.readingFluency)

            const percentColumn = headers.reduce((acc, prev) => {
              const key = prev.readingFluencyExam.id;
              if(!acc[key]) { acc[key] = 0 }
              return acc
            }, {} as any)

            for(let header of headers) {

              const el = allFluencies.filter((el: any) => {
                const sameClassroom = el.rClassroom?.id === classroomId
                const sameReadFluencyId = el.readingFluencyExam.id === header.readingFluencyExam.id
                const sameReadFluencyLevel = el.readingFluencyLevel?.id === header.readingFluencyLevel.id
                return sameClassroom && sameReadFluencyId && sameReadFluencyLevel
              })

              const value = el.length ?? 0
              totalNuColumn.push({ total: value, divideByExamId: header.readingFluencyExam.id })
              percentColumn[header.readingFluencyExam.id] += value
            }

            const totalPeColumn = totalNuColumn.map(el => Math.floor((el.total / percentColumn[el.divideByExamId]) * 10000) / 100)
            data = { test, classroom, studentClassrooms, fluencyHeaders, totalNuColumn: totalNuColumn.map(el => el.total), totalPeColumn }
            break;
          }

          case (TEST_CATEGORIES_IDS.AVL_ITA):
          case (TEST_CATEGORIES_IDS.TEST_4_9): {

            let testQuestionsIds: number[] = []

            const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "classroomCategory.id", "classroomCategory.name", "questionGroup.id", "questionGroup.name"]
            const testQuestions = await this.getTestQuestions(test.id, CONN, fields)

            testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ]
            const questionGroups = await this.getTestQuestionsGroups(testId, CONN)

            let classroomPoints = 0
            let classroomPercent = 0
            let validStudentsTotalizator = 0
            let totals: Totals[] = testQuestions.map(el => ({ id: el.id, tNumber: 0, tTotal: 0, tRate: 0 }))
            let answersLetters: { letter: string, questions: {  id: number, order: number, occurrences: number, percentage: number }[] }[] = []

            await this.testQuestLink(true, await this.studentClassrooms(test, Number(classroomId), (yearName as string), CONN), test, testQuestions, uTeacher.person.user.id, CONN)

            let diffOe = 0
            let validSc = 0

            const mappedResult = (await this.stuQuestionsWithDuplicated(test, testQuestions, Number(classroomId), yearName as string, CONN))
              .map((sc: StudentClassroom) => {

                const studentTotals = { rowTotal: 0, rowPercent: 0 }

                if(sc.student.studentQuestions.every(sq => sq.answer?.length < 1)) { return { ...sc, student: { ...sc.student, studentTotals: { rowTotal: '-', rowPercent: '-' } } } }

                if((sc as any).ignore || sc.student.studentQuestions.every(sq => sq.rClassroom?.id != classroom.id) && !sc.endedAt) {

                  sc.student.studentQuestions = sc.student.studentQuestions.map(sq => ({...sq, answer: 'OE'}))

                  diffOe += 1; return { ...sc, student: { ...sc.student, studentTotals: { rowTotal: 'OE', rowPercent: 'OE' } } }
                }

                if(sc.student.studentQuestions.every(sq => sq.rClassroom?.id != classroom.id)) {

                  sc.student.studentQuestions = sc.student.studentQuestions.map(sq => ({...sq, answer: 'TR'}))

                  diffOe += 1; return { ...sc, student: { ...sc.student, studentTotals: { rowTotal: 'TR', rowPercent: 'TR' } } }
                }

                validSc += 1
                validStudentsTotalizator += 1

                let counterPercentage = 0

                studentTotals.rowTotal = testQuestions.reduce((acc, testQuestion) => {

                  if(!testQuestion.active) { validStudentsTotalizator -= 1; return acc }

                  counterPercentage += 1

                  const studentQuestion = sc.student.studentQuestions.find((sq: any) => sq.testQuestion.id === testQuestion.id)

                  if((studentQuestion?.rClassroom?.id != classroom.id )){ return acc }

                  let element = totals.find(el => el.id === testQuestion.id)

                  if ((studentQuestion?.rClassroom?.id === classroom.id ) && studentQuestion?.answer != '' && studentQuestion?.answer != ' ' && testQuestion.answer?.trim().includes(studentQuestion?.answer.toUpperCase().trim())) {
                    element!.tNumber += 1
                    classroomPoints += 1
                    acc += 1
                  }

                  element!.tTotal += 1
                  classroomPercent += 1
                  element!.tRate = Math.floor((element!.tNumber / element!.tTotal) * 10000) / 100;

                  const letter = studentQuestion?.answer && studentQuestion.answer.trim().length ? studentQuestion.answer.toUpperCase().trim() : 'VAZIO';

                  let ltItem = answersLetters.find(el => el.letter === letter)
                  if(!ltItem) { ltItem = { letter, questions: [] }; answersLetters.push(ltItem) }

                  let ltQ = ltItem.questions.find(tQ => tQ.id === testQuestion.id)
                  if(!ltQ) { ltQ = { id: testQuestion.id, order: testQuestion.order, occurrences: 0, percentage: 0 }; ltItem.questions.push(ltQ) }

                  ltQ.occurrences += 1

                  answersLetters = answersLetters.map(el => ({...el, questions: el.questions.map(it => ({...it, percentage: Math.floor((it.occurrences / element!.tTotal) * 10000) / 100}))})).sort((a, b) => a.letter.localeCompare(b.letter))

                  return acc
                }, 0)

                studentTotals.rowPercent = Math.floor((studentTotals.rowTotal / counterPercentage) * 10000) / 100;

                return { ...sc, student: { ...sc.student, studentTotals } }
              })

            for(let item of mappedResult) {
              for(let el of item.student.studentDisabilities) {
                el.disability = await CONN.findOne(Disability, { where: {studentDisabilities: el} }) as Disability
              }
            }

            data = {
              test,
              totals,
              answersLetters,
              validSc,
              totalOfSc: mappedResult.length - diffOe,
              totalOfScPercentage: Math.floor((validSc / (mappedResult.length - diffOe)) * 10000) / 100,
              classroom,
              testQuestions,
              questionGroups,
              classroomPoints,
              studentClassrooms: mappedResult,
              classroomPercent: Math.floor((classroomPoints / classroomPercent) * 10000) / 100
            }
            break;
          }
        }
        return { status: 200, data };
      })
    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message } }
  }

  async studentClassrooms(test: Test, classroomId: number, yearName: string, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .leftJoin("studentClassroom.student", "student")
      .addSelect(['student.id'])
      .leftJoin("student.studentQuestions", "studentQuestions")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
        qb.orWhere("studentQuestions.id IS NOT NULL")
      }))
      .andWhere("studentClassroomYear.name = :yearName", { yearName })
      .getMany();
  }

  async studentClassroomsAlphabetic(test: Test, classroomId: number, yearName: string, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .leftJoin("student.alphabetic", "alphabetic")
      .leftJoin("alphabetic.test", "test")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
        qb.orWhere("alphabetic.id IS NOT NULL")
      }))
      .andWhere("year.name = :yearName", { yearName })
      .getMany();
  }

  async createLinkAlphabetic(studentClassrooms: ObjectLiteral[], test: Test, userId: number, CONN: EntityManager) {
    for(let studentClassroom of studentClassrooms) {
      const sAlphabetic = await CONN.findOne(Alphabetic, { where: { test: { id: test.id }, student: { id: studentClassroom.student?.id } } } )
      if(!sAlphabetic) { await CONN.save(Alphabetic, { createdAt: new Date(), createdByUser: userId, student: studentClassroom.student, test } ) }
    }
  }

  async getAlphabeticStudents(test: Test, classroomId: number, yearName: string, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      // .leftJoinAndSelect("student.alphabeticFirst", "alphabeticFirst")
      // .leftJoinAndSelect("alphabeticFirst.alphabeticFirst", "alphabeticFirstStudentLevel")
      .leftJoinAndSelect("student.alphabetic", "alphabetic")
      .leftJoinAndSelect("alphabetic.rClassroom", "rClassroom")
      .leftJoinAndSelect("alphabetic.alphabeticLevel", "alphabeticLevel")
      .leftJoinAndSelect("alphabetic.test", "stAlphabeticTest")
      .leftJoinAndSelect("stAlphabeticTest.discipline", "testDiscipline")
      .leftJoinAndSelect("stAlphabeticTest.category", "testCategory")
      .leftJoinAndSelect("stAlphabeticTest.period", "period")
      .leftJoinAndSelect("period.bimester", "bimester")
      .leftJoinAndSelect("period.year", "pYear")
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("student.person", "person")
      .leftJoin("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
        qb.orWhere("alphabetic.id IS NOT NULL")
      }))
      .andWhere("testDiscipline.id = :testDiscipline", { testDiscipline: test.discipline.id })
      .andWhere("testCategory.id = :testCategory", { testCategory: test.category.id })
      .andWhere("year.name = :yearName", { yearName })
      .andWhere("pYear.name = :yearName", { yearName })
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .getMany()
  }

  async linkReading(headers: ReadingFluencyGroup[], studentClassrooms: ObjectLiteral[], test: Test, userId: number, CONN: EntityManager) {
    for(let studentClassroom of studentClassrooms) {
      const options = { where: { test: { id: test.id }, studentClassroom: { id: studentClassroom.id } }}
      const stStatus = await CONN.findOne(StudentTestStatus, options)
      const el = { active: true, test, studentClassroom, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
      if(!stStatus) { await CONN.save(StudentTestStatus, el) }
      for(let exam of headers.flatMap(el => el.readingFluencyExam)) {
        const options = { where: { readingFluencyExam: { id: exam.id }, test: { id: test.id }, student: { id: studentClassroom?.student?.id ?? studentClassroom?.student_id } } }
        const sReadingFluency = await CONN.findOne(ReadingFluency, options)
        if(!sReadingFluency) { await CONN.save(ReadingFluency, { createdAt: new Date(), createdByUser: userId, student: { id: studentClassroom?.student?.id ?? studentClassroom?.student_id }, test, readingFluencyExam: exam }) }
      }
    }
  }

  async stuQuestionsWithDuplicated(test: Test, testQuestions: TestQuestion[], classroomId: number, yearName: string, CONN: EntityManager) {

    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id);

    let studentClassrooms = await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "stStatusTest")
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("classroom.school", "school")
      .leftJoinAndSelect("student.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentQuestions.rClassroom", "rClassroom")
      .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
      .leftJoin("testQuestion.questionGroup", "questionGroup")
      .leftJoin("testQuestion.test", "test")
      .leftJoinAndSelect("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
        qb.orWhere("studentQuestions.id IS NOT NULL")
      }))
      .andWhere("testQuestion.test = :testId", { testId: test.id })
      .andWhere("stStatusTest.id = :testId", { testId: test.id })
      .andWhere("year.name = :yearName", { yearName })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .getMany();

    return this.duplicatedStudents(studentClassrooms).map((sc: any) => ({ ...sc, studentStatus: sc.studentStatus.find((studentStatus: any) => studentStatus.test.id === test.id) }))
  }

  async stuClassReadF(test: Test, classroomId: number, yearName: string, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoin("studentClassroom.year", "year")
      .leftJoin("studentClassroom.studentStatus", "studentStatus")
      .leftJoin("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
        qb.orWhere("readingFluency.id IS NOT NULL")
      }))
      .andWhere("year.name = :yearName", { yearName })
      .getMany();
  }

  async getTestQuestionsGroups(testId: number, CONN: EntityManager) {
    return await CONN.getRepository(QuestionGroup)
      .createQueryBuilder("questionGroup")
      .select(["questionGroup.id AS id", "questionGroup.name AS name"])
      .addSelect("COUNT(testQuestions.id)", "questionsCount")
      .leftJoin("questionGroup.testQuestions", "testQuestions")
      .where("testQuestions.test = :testId", { testId })
      .groupBy("questionGroup.id")
      .getRawMany();
  }

  async getAllToInsert(request: Request) {
    const testId = request?.params.id
    const classroomId = request?.params.classroom
    const yearName = request.params.year
    try {
      return await AppDataSource.transaction(async (CONN) => {
        const test = await this.getTest(Number(testId), Number(yearName), CONN)
        if(!test) return { status: 404, message: "Teste não encontrado" }
        let data;
        switch (test.category.id) {
          case TEST_CATEGORIES_IDS.LITE_1:
          case TEST_CATEGORIES_IDS.LITE_2:
          case TEST_CATEGORIES_IDS.LITE_3: {
            data = await this.notIncludedAL(test, Number(classroomId), Number(yearName), CONN)
            break;
          }
          case TEST_CATEGORIES_IDS.READ_2:
          case TEST_CATEGORIES_IDS.READ_3: {
            data = await this.notIncludedRF(test, Number(classroomId), Number(yearName), CONN)
            break;
          }
          case TEST_CATEGORIES_IDS.AVL_ITA:
          case TEST_CATEGORIES_IDS.TEST_4_9: {
            data = await this.notTestIncluded(test, Number(classroomId), Number(yearName), CONN)
            break;
          }
        }
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async testQuestLink(withTestStatus: boolean, studentClassrooms: any[], test: Test, testQuestions: TestQuestion[], userId: number, CONN: EntityManager) {
    for(let studentClassroom of studentClassrooms) {
      if(withTestStatus){
        const options = { where: { test: { id: test.id }, studentClassroom: { id: studentClassroom.id } }}
        const stStatus = await CONN.findOne(StudentTestStatus, options)
        const el = { active: true, test, studentClassroom, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
        if(!stStatus) { await CONN.save(StudentTestStatus, el) }
      }
      for(let testQuestion of testQuestions) {
        const options = { where: { testQuestion: { id: testQuestion.id, test: { id: test.id }, question: { id: testQuestion.question.id } }, student: { id: studentClassroom.student?.id ?? studentClassroom.student_id } } }
        const sQuestion = await CONN.findOne(StudentQuestion, options) as StudentQuestion
        if(!sQuestion) { await CONN.save(StudentQuestion, { answer: '', testQuestion: testQuestion, student: { id: studentClassroom.student?.id ?? studentClassroom.student_id }, createdAt: new Date(), createdByUser: userId })}
      }
    }
  }

  async insertStudents(req: Request) {

    const body = req.body as insertStudentsBody
    try {
      return await AppDataSource.transaction(async (CONN) => {
        const uTeacher = await this.teacherByUser(body.user.user, CONN)
        const test = await this.getTest(body.test.id, body.year, CONN)
        if(!test) return { status: 404, message: "Teste não encontrado" }
        switch (test.category.id) {
          case (TEST_CATEGORIES_IDS.LITE_1):
          case (TEST_CATEGORIES_IDS.LITE_2):
          case (TEST_CATEGORIES_IDS.LITE_3): {
            const stClassrooms = await this.notIncludedAL(test, body.classroom.id, body.year, CONN)
            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id))
            for(let register of filteredSC){
              const sAlphabetic = await CONN.findOne(Alphabetic, { where: { test: { id: test.id }, student: { id: register.student_id } } } )
              if(!sAlphabetic) { await CONN.save(Alphabetic, { createdAt: new Date(), createdByUser: uTeacher.person.user.id, student: { id: register.student_id }, test } ) }
            }
            break;
          }

          case (TEST_CATEGORIES_IDS.READ_2):
          case (TEST_CATEGORIES_IDS.READ_3): {
            const stClassrooms = await this.notIncludedRF(test, body.classroom.id, body.year, CONN)
            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id))
            const headers = await this.getReadingFluencyHeaders(CONN)
            await this.linkReading(headers, filteredSC, test, uTeacher.person.user.id, CONN)
            break;
          }

          case (TEST_CATEGORIES_IDS.AVL_ITA):
          case (TEST_CATEGORIES_IDS.TEST_4_9): {
            const stClassrooms = await this.notTestIncluded(test, body.classroom.id, body.year, CONN)
            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id)) as unknown as StudentClassroom[]
            const testQuestions = await this.getTestQuestions(test.id, CONN)
            await this.testQuestLink(true, filteredSC, test, testQuestions, uTeacher.person.user.id, CONN)
            break;
          }
        }
        return { status: 200, data: {} };
      })
    } catch (error: any) {
      console.log('insertStudents', error)
      return { status: 500, message: error.message }
    }
  }

  async notTestIncluded(test: Test, classroomId: number, yearName: number, CONN: EntityManager) {

    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .select([ 'studentClassroom.id AS id', 'studentClassroom.rosterNumber AS rosterNumber', 'studentClassroom.startedAt AS startedAt', 'studentClassroom.endedAt AS endedAt', 'person.name AS name', 'student.ra AS ra', 'student.dv AS dv' ])
      .leftJoin("studentClassroom.year", "year")
      .leftJoin("studentClassroom.studentStatus", "studentStatus")
      .leftJoin("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
      .leftJoin("test.category", "testCategory")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoin("student.studentQuestions", "studentQuestions")
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere("studentClassroom.startedAt > :testCreatedAt", { testCreatedAt: test.createdAt })
      .andWhere("studentClassroom.endedAt IS NULL")
      .andWhere("year.name = :yearName", { yearName })
      .andWhere("studentQuestions.id IS NULL")
      .getRawMany() as unknown as notIncludedInterface[]
  }

  async notIncludedRF(test: Test, classroomId: number, yearName: number, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .select([ 'studentClassroom.id AS id', 'studentClassroom.rosterNumber AS rosterNumber', 'studentClassroom.startedAt AS startedAt', 'studentClassroom.endedAt AS endedAt', 'person.name AS name', 'student.ra AS ra', 'student.dv AS dv' ])
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoin("studentClassroom.studentStatus", "studentStatus")
      .leftJoin("studentStatus.test", "test", "test.id = :testId", {testId: test.id})
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", {classroomId})
      .andWhere("studentClassroom.startedAt > :testCreatedAt", {testCreatedAt: test.createdAt})
      .andWhere("studentClassroom.endedAt IS NULL")
      .andWhere("year.name = :yearName", {yearName})
      .andWhere("readingFluency.id IS NULL")
      .getRawMany() as unknown as notIncludedInterface[]
  }

  async notIncludedAL(test: Test, classroomId: number, yearName: number, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .select([ 'studentClassroom.id AS id', 'studentClassroom.rosterNumber AS rosterNumber', 'studentClassroom.startedAt AS startedAt', 'studentClassroom.endedAt AS endedAt', 'person.name AS name', 'student.ra AS ra', 'student.dv AS dv' ])
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoin("student.alphabetic", "alphabetic")
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", {classroomId})
      .andWhere("studentClassroom.startedAt > :testCreatedAt", {testCreatedAt: test.createdAt})
      .andWhere("studentClassroom.endedAt IS NULL")
      .andWhere("year.name = :yearName", {yearName})
      .andWhere("alphabetic.id IS NULL")
      .getRawMany()
  }

  async findAllByYear(request: Request) {

    try {
      return AppDataSource.transaction(async(CONN) => {

        const yearName = request.params.year
        const search = request.query.search as string
        const limit =  !isNaN(parseInt(request.query.limit as string)) ? parseInt(request.query.limit as string) : 100
        const offset =  !isNaN(parseInt(request.query.offset as string)) ? parseInt(request.query.offset as string) : 0

        const teacher = await this.teacherByUser(request.body.user.user, CONN);

        const masterTeacher = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE || teacher.person.category.id === pc.FORM

        const teacherClasses = await this.teacherClassrooms(request?.body.user, CONN)
        const teacherDisciplines = await this.teacherDisciplines(request?.body.user, CONN);

        const testClasses = await CONN.getRepository(Test)
          .createQueryBuilder("test")
          .leftJoinAndSelect("test.person", "person")
          .leftJoinAndSelect("test.period", "period")
          .leftJoinAndSelect("test.category", "category")
          .leftJoinAndSelect("period.year", "year")
          .leftJoinAndSelect("period.bimester", "bimester")
          .leftJoinAndSelect("test.discipline", "discipline")
          .leftJoinAndSelect("test.classrooms", "classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .where(new Brackets(qb => {
            if (!masterTeacher) {
              qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
              qb.andWhere("discipline.id IN (:...teacherDisciplines)", { teacherDisciplines: teacherDisciplines.disciplines });
            }
          }))
          .andWhere("year.name = :yearName", { yearName })
          .andWhere( new Brackets((qb) => {
            qb.where("test.name LIKE :search", { search: `%${ search }%` })
              .orWhere("classroom.shortName LIKE :search", { search: `%${ search }%` })
              .orWhere("school.name LIKE :search", { search: `%${ search }%` })
              .orWhere("school.shortName LIKE :search", { search: `%${ search }%` })
          }))
          .addOrderBy('discipline.name')
          .addOrderBy('school.shortName')
          .addOrderBy('classroom.shortName')
          .take(limit)
          .skip(offset)
          .getMany();
        return { status: 200, data: testClasses };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getById(req: Request) {
    const { id } = req.params
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const teacher = await this.teacherByUser(req.body.user.user, CONN)
        const masterUser = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE || teacher.person.category.id === pc.FORM;
        const op = { relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"], where: { id: parseInt(id) } }
        const test = await CONN.findOne(Test, { ...op })
        if(teacher.person.id !== test?.person.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }
        if (!test) { return { status: 404, message: 'Data not found' } }
        const testQuestions = await this.getTestQuestions(test.id, CONN)
        return { status: 200, data: { ...test, testQuestions } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async saveTest(body: TestBodySave) {

    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id)

    try {

      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN);

        if(!uTeacher) return { status: 404, message: "Usuário inexistente" }

        const checkYear = await CONN.findOne(Year, { where: { id: body.year.id } })

        if(!checkYear) return { status: 404, message: "Ano não encontrado" }

        if(!checkYear.active) return { status: 400, message: "Não é possível criar um teste para um ano letivo inativo." }

        const period = await CONN.findOne(Period, { relations: ["year", "bimester"], where: { year: body.year, bimester: body.bimester } })

        if(!period) return { status: 404, message: "Período não encontrado" }

        if([TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(body.category.id)) {

          const test = await CONN.findOne(Test, { where: { category: body.category, discipline: body.discipline, period: period } })

          if(test) { return { status: 409, message: `Já existe uma avaliação criada com a categoria, disciplina e período informados.` } }

        }

        const classes = await CONN.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .select(["classroom.id", "classroom.name", "classroom.shortName"])
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.student", "student")
          .leftJoinAndSelect("student.person", "person")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoin('studentClassroom.year', 'year')
          .where("classroom.id IN (:...classesIds)", { classesIds })
          .andWhere('year.id = :yearId', { yearId: period.year.id })
          .andWhere("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: new Date() })
          .andWhere('studentClassroom.endedAt IS NULL')
          .groupBy("classroom.id, studentClassroom.id")
          .having("COUNT(studentClassroom.id) > 0")
          .getMany();

        if(!classes || classes.length < 1) return { status: 400, message: "Não existem alunos matriculados em uma ou mais salas informadas." }

        const test = new Test()
        test.name = body.name
        test.category = body.category as TestCategory
        test.discipline = body.discipline as Discipline
        test.person = uTeacher.person
        test.period = period
        test.classrooms = classes.map(el => ({ id: el.id })) as Classroom[]
        test.createdAt = new Date()
        test.createdByUser = uTeacher.person.user.id

        await CONN.save(Test, test);

        const haveQuestions = [TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3, TEST_CATEGORIES_IDS.TEST_4_9, TEST_CATEGORIES_IDS.AVL_ITA]

        if(haveQuestions.includes(body.category.id)) {

          const tQts = body.testQuestions!.map((el: any) => ({
            ...el,
            createdAt: new Date(),
            createdByUser: uTeacher.person.user.id,
            question: { ...el.question, person: el.question.person || uTeacher.person, createdAt: new Date(), createdByUser: uTeacher.person.user.id },
            test: test
          }))

          await CONN.save(TestQuestion, tQts)
        }

        return { status: 201, data: test }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTest(id: number | string, req: Request) {
    try {
      return await AppDataSource.transaction(async (CONN) => {
        const uTeacher = await this.teacherByUser(req.body.user.user, CONN) as Teacher
        const userId = uTeacher.person.user.id
        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE || uTeacher.person.category.id === pc.FORM;
        const test = await CONN.findOne(Test, { relations: ["person"], where: { id: Number(id) } })
        if(!test) return { status: 404, message: "Teste não encontrado" }
        if(uTeacher.person.id !== test.person.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }
        test.name = req.body.name
        test.active = req.body.active
        test.updatedAt = new Date()
        test.updatedByUser = userId
        await CONN.save(Test, test)
        if(req.body.testQuestions.length){
          const bodyTq = req.body.testQuestions as TestQuestion[]
          const dataTq = await this.getTestQuestions(test.id, CONN)
          for (let next of bodyTq) {
            const curr = dataTq.find(el => el.id === next.id);
            if (!curr) { await CONN.save(TestQuestion, { ...next, createdAt: new Date(), createdByUser: userId, question: { ...next.question, person: next.question.person || uTeacher.person, createdAt: new Date(), createdByUser: userId, }, test }) }
            else {
              const testQuestionCondition = this.diffs(curr, next);
              if (testQuestionCondition) { await CONN.save(TestQuestion, { ...next, createdAt: curr.createdAt, createdByUser: curr.createdByUser, updatedAt: new Date(), updatedByUser: userId }) }
              if (this.diffs(curr.question, next.question)) { await CONN.save(Question, {...next.question,createdAt: curr.question.createdAt,createdByUser: curr.question.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.question.descriptor, next.question.descriptor)) { await CONN.save(Descriptor, { ...next.question.descriptor, createdAt: curr.question.descriptor.createdAt, createdByUser: curr.question.descriptor.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.question.descriptor.topic, next.question.descriptor.topic)) { await CONN.save(Topic, { ...next.question.descriptor.topic, createdAt: curr.question.descriptor.topic.createdAt, createdByUser: curr.question.descriptor.topic.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.question.descriptor.topic.classroomCategory, next.question.descriptor.topic.classroomCategory)) { await CONN.save(ClassroomCategory, { ...next.question.descriptor.topic.classroomCategory, createdAt: curr.question.descriptor.topic.classroomCategory.createdAt, createdByUser: curr.question.descriptor.topic.classroomCategory.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.questionGroup, next.questionGroup)) { await CONN.save(QuestionGroup, { ...next.questionGroup, createdAt: curr.questionGroup.createdAt, createdByUser: curr.questionGroup.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
            }
          }
        }
        const result = (await this.findOneById(id, req, CONN)).data
        return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getTest(testId: number | string , yearName: number | string, CONN: EntityManager) {
    return CONN.getRepository(Test)
      .createQueryBuilder("test")
      .leftJoinAndSelect("test.person", "person")
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.bimester", "bimester")
      .leftJoinAndSelect("period.year", "year")
      .leftJoinAndSelect("test.discipline", "discipline")
      .leftJoinAndSelect("test.category", "category")
      .where("test.id = :testId", { testId })
      .andWhere("year.name = :yearName", { yearName })
      .getOne()
  }

  async getReadingFluencyHeaders(CONN: EntityManager) {
    return await CONN.getRepository(ReadingFluencyGroup)
      .createQueryBuilder("rfg")
      .leftJoinAndSelect("rfg.readingFluencyExam", "readingFluencyExam")
      .leftJoinAndSelect("rfg.readingFluencyLevel", "readingFluencyLevel")
      .getMany() as ReadingFluencyGroup[]
  }

  async getTestQuestions(testId: number, CONN: EntityManager, selectFields?: string[]) {
    const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "question.title", "person.id", "question.person", "descriptor.id", "descriptor.code", "descriptor.name", "topic.id", "topic.name", "topic.description", "classroomCategory.id", "classroomCategory.name", "questionGroup.id", "questionGroup.name"]
    return await CONN.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .select(selectFields ?? fields)
      .leftJoin("testQuestion.question", "question")
      .leftJoin("question.person", "person")
      .leftJoin("question.descriptor", "descriptor")
      .leftJoin("descriptor.topic", "topic")
      .leftJoin("topic.classroomCategory", "classroomCategory")
      .leftJoin("testQuestion.questionGroup", "questionGroup")
      .where("testQuestion.test = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany();
  }

  async getTestQuestionsSimple(testId: string, CONN: EntityManager){
    return await CONN.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .select(["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active"])
      .leftJoin("testQuestion.questionGroup", "questionGroup")
      .where("testQuestion.test = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany();
  }

  async getReadingFluencyStudents(test: Test, classroomId: number, yearName: string, CONN: EntityManager) {
    let studentClassrooms = await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoinAndSelect("readingFluency.rClassroom", "rClassroom")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("readingFluency.readingFluencyExam", "readingFluencyExam")
      .leftJoinAndSelect("readingFluency.readingFluencyLevel", "readingFluencyLevel")
      .leftJoinAndSelect("studentStatus.test", "stStatusTest")
      .leftJoinAndSelect("readingFluency.test", "stReadFluenTest")
      .leftJoinAndSelect("studentClassroom.year", "year")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
        qb.orWhere("readingFluency.id IS NOT NULL")
      }))
      .andWhere("stReadFluenTest.id = :testId", { testId: test.id })
      .andWhere("stStatusTest.id = :testId", { testId: test.id })
      .andWhere("year.name = :yearName", { yearName })
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .getMany()

    return this.duplicatedStudents(studentClassrooms).map((sc: any) => ({ ...sc, studentStatus: sc.studentStatus.find((studentStatus: any) => studentStatus.test.id === test.id) }))
  }

  async getTestForGraphic(testId: string, yearId: string, CONN: EntityManager) {

    const testQuestions = await this.getTestQuestionsSimple(testId, CONN)
    if (!testQuestions) return { status: 404, message: "Questões não encontradas" }
    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)

    const test = await CONN.getRepository(Test)
      .createQueryBuilder("test")
      .select(['test.id', 'test.name'])
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.bimester", "periodBimester")
      .leftJoin("period.year", "periodYear")
      .addSelect(['periodYear.id', 'periodYear.name', 'periodYear.active'])
      .leftJoinAndSelect("test.discipline", "discipline")
      .leftJoinAndSelect("test.category", "category")
      .leftJoin("test.person", "testPerson")
      .addSelect(['testPerson.id', 'testPerson.name'])
      .leftJoinAndSelect("test.classrooms", "classroom")
      .leftJoinAndSelect("classroom.school", "school")
      .leftJoin("classroom.studentClassrooms", "studentClassroom")
      .addSelect(['studentClassroom.id', 'studentClassroom.student', 'studentClassroom.classroom', 'studentClassroom.endedAt'])
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
      .leftJoin("studentClassroom.student", "student")
      .addSelect(['student.id'])
      .leftJoinAndSelect("student.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentQuestions.rClassroom", "rClassroom")
      .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
      .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
      .leftJoinAndSelect("student.person", "studentPerson")
      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .where("test.id = :testId", { testId })
      .andWhere("periodYear.id = :yearId", { yearId })
      .andWhere("studentClassroomYear.id = :yearId", { yearId })
      .andWhere("testQuestion.test = :testId", { testId })
      .andWhere("studentStatusTest.id = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      // .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .addOrderBy("classroom.shortName", "ASC")
      .getOne()
    return { test, testQuestions }
  }

  async getReadingFluencyForGraphic(testId: string, yearId: string, CONN: EntityManager) {
    let data = await CONN.getRepository(Test)
      .createQueryBuilder("test")
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.bimester", "periodBimester")
      .leftJoinAndSelect("period.year", "periodYear")
      .leftJoinAndSelect("test.discipline", "discipline")
      .leftJoinAndSelect("test.category", "category")
      .leftJoinAndSelect("test.person", "testPerson")
      .leftJoinAndSelect("test.classrooms", "classroom")
      .leftJoinAndSelect("classroom.school", "school")
      .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
      .leftJoinAndSelect("studentClassroom.classroom", "currentClassroom")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoinAndSelect("readingFluency.rClassroom", "rClassroom")
      .leftJoinAndSelect("readingFluency.readingFluencyExam", "readingFluencyExam")
      .leftJoinAndSelect("readingFluency.readingFluencyLevel", "readingFluencyLevel")
      .leftJoinAndSelect("student.person", "studentPerson")
      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .where("test.id = :testId", { testId })
      .andWhere("periodYear.id = :yearId", { yearId })
      .andWhere("studentClassroomYear.id = :yearId", { yearId })
      .andWhere("readingFluency.test = :testId", { testId })
      .andWhere("studentStatusTest.id = :testId", { testId })
      .addOrderBy("classroom.shortName", "ASC")
      .getOne()

    if(data) {
      data = {
        ...data,
        classrooms: data.classrooms.map(classroom => {
          const studentClassrooms = this.duplicatedStudents(classroom.studentClassrooms).filter((el: any) => !el.ignore) as StudentClassroom[]
          return { ...classroom, studentClassrooms }
        })
      }
    }

    return data
  }

  async alphaHeaders(yearName: string, CONN: EntityManager){

    const year = await CONN.getRepository(Year)
      .createQueryBuilder("year")
      .select(['year.id', 'year.name', 'periods.id', 'bimester.id', 'bimester.name', 'bimester.testName'])
      .leftJoinAndSelect("year.periods", "periods")
      .leftJoinAndSelect("periods.bimester", "bimester")
      .where("year.name = :yearName", { yearName })
      .getMany()

    const alphabeticLevels = await CONN.getRepository(AlphabeticLevel)
      .createQueryBuilder("alphabeticLevel")
      .select(['alphabeticLevel.id', 'alphabeticLevel.shortName', 'alphabeticLevel.color', ])
      .getMany()

    return year.flatMap(y => y.periods.flatMap(el => ({...el.bimester, levels: alphabeticLevels})))
  }

  async alphabeticTests(yearName: string, test: Test, CONN: EntityManager){
    return await CONN.getRepository(Test)
      .createQueryBuilder('test')
      .select(['test.id', 'test.active'])
      .leftJoinAndSelect("test.discipline", "discipline")
      .addSelect(['discipline.id'])
      .leftJoinAndSelect("test.period", "period")
      .leftJoin("period.bimester", "bimester")
      .addSelect(['bimester.id'])
      .leftJoin("period.year", "year")
      .addSelect(['year.id'])
      .leftJoin("test.category", "category")
      .addSelect(['category.id'])
      .where("category.id = :testCategory", { testCategory: test.category.id })
      .andWhere("discipline.id = :disciplineId", { disciplineId: test.discipline.id })
      .andWhere("year.name = :yearName", { yearName })
      .getMany()
  }

  async alphabeticTest(questions: boolean, aHeaders: AlphaHeaders[], test: Test, sC: StudentClassroom[], room: Classroom, classId: number, uTeacher: Teacher, yearN: string, CONN: EntityManager){

    await this.createLinkAlphabetic(sC, test, uTeacher.person.user.id, CONN)

    const tests = await this.alphabeticTests(yearN, test, CONN)

    let headers = aHeaders.map(bi => {

      const test = tests.find(test => test.period.bimester.id === bi.id)

      return {...bi, currTest: { id: test?.id, active: test?.active }}
    })

    let preResultSc = await this.getAlphabeticStudents(test, classId, yearN, CONN )

    if(questions) {

      let testQuestionsIds: number[] = []

      for(let test of tests) {

        const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "questionGroup.id", "questionGroup.name"]

        const testQuestions = await this.getTestQuestions(test.id, CONN, fields)
        test.testQuestions = testQuestions

        testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ]

        await this.testQuestLink(false, preResultSc, test, testQuestions, uTeacher.person.user.id, CONN)
      }

      headers = headers.map(bi => { return { ...bi, testQuestions: tests.find(test => test.period.bimester.id === bi.id)?.testQuestions } })

      preResultSc = (await this.alphaQuestions(yearN, test, testQuestionsIds, CONN, classId))
        .flatMap(school => school.classrooms.flatMap(classroom => classroom.studentClassrooms))

    }

    let studentClassrooms = preResultSc.map(el => ({ ...el, studentRowTotal: el.student.alphabetic.reduce((acc, curr) => acc + (curr.alphabeticLevel?.id ? 1 : 0), 0) }))

    const studentCount = studentClassrooms.reduce((acc, item) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);

    const duplicatedStudents = studentClassrooms.filter(item => studentCount[item.student.id] > 1).map(d => d.endedAt ? { ...d, ignore: true } : d)

    // Visual return for frontEnd
    studentClassrooms = studentClassrooms.map(item => {
      const duplicated = duplicatedStudents.find(d => d.id === item.id);
      const newItem = duplicated ? { ...duplicated } : { ...item };

      newItem.student.alphabetic = newItem.student.alphabetic.map(alpha => {
        if(item.endedAt && alpha.rClassroom?.id && alpha.rClassroom.id != room.id) { return { ...alpha, gray: true } }

        if(!item.endedAt && alpha.rClassroom?.id && alpha.rClassroom.id != room.id) { return { ...alpha, gray: true } }

        if(alpha.rClassroom?.id && alpha.rClassroom.id != room.id) { return { ...alpha, gray: true } }
        return alpha
      })

      newItem.student.studentQuestions = newItem.student.studentQuestions?.map(sQ => {

        if(item.endedAt && sQ.rClassroom?.id && sQ.rClassroom.id != room.id) { return { ...sQ, answer: 'TR' } }

        if(!item.endedAt && sQ.rClassroom?.id && sQ.rClassroom.id != room.id) { return { ...sQ, answer: 'OE' } }

        if(sQ.rClassroom?.id && sQ.rClassroom.id != room.id) { return { ...sQ, answer: '-' } }

        return { ...sQ }
      })

      return newItem;
    });

    const allAlphabetic = studentClassrooms.filter((el: any) => !el.ignore).flatMap(el => el.student.alphabetic)

    for(let item of studentClassrooms) { for(let el of item.student.studentDisabilities) { el.disability = await CONN.findOne(Disability, { where: { studentDisabilities: el } }) as Disability } }

    headers = headers.map(bim => {

      let bimesterCounter = 0;

      const studentClassroomsBi = studentClassrooms
        .filter((el: any) => !el.ignore)
        .filter(sc => sc.student.studentQuestions?.some(sq => (sq.rClassroom?.id === room.id) && (sq.testQuestion.test.period.bimester.id === bim.id) && (sq.answer && sq.answer != 'null' && sq.answer.length > 0 && sq.answer != '' && sq.answer != ' ')))

      const allStudentQuestions = studentClassroomsBi.flatMap(sc => sc.student.studentQuestions )
      const testQuestions = bim.testQuestions?.map(tQ => {

        if(!tQ.active) { return { ...tQ, counter: 0, counterPercentage: 0 } }

        const studentQuestions = allStudentQuestions.filter(sQ => { return sQ.testQuestion?.id === tQ?.id })

        const counter = studentQuestions.reduce((acc, sQ) => {

          if(sQ.rClassroom?.id != classId){ return acc }

          if (sQ.rClassroom?.id === classId && (sQ.answer && sQ.answer != 'null' && sQ.answer.length > 0 && sQ.answer != '' && sQ.answer != ' ') && tQ.answer?.includes(sQ.answer.toUpperCase())) { return acc + 1 } return acc
        }, 0)

        return { ...tQ, counter, counterPercentage: studentClassroomsBi.length > 0 ? Math.floor((counter / studentClassroomsBi.length) * 10000) / 100 : 0 }
      })

      const levels = bim.levels.map(level => {
        const levelCounter = allAlphabetic.reduce((acc, prev) => {
          return acc + (prev.rClassroom?.id === classId && prev.test.period.bimester.id === bim.id && prev.alphabeticLevel?.id === level.id ? 1 : 0);
        }, 0)

        bimesterCounter += levelCounter
        return { ...level, levelCounter }
      })

      return { ...bim, bimesterCounter, testQuestions,
        levels: levels.map(level => ({ ...level, levelPercentage: bimesterCounter > 0 ? Math.floor((level.levelCounter / bimesterCounter) * 10000) / 100 : 0}))
      }
    })

    return { test, studentClassrooms, classroom: room, alphabeticHeaders: headers }
  }

  async alphaQuestions(yearName: string, test: Test, testQuestionsIds: number[], CONN: EntityManager, classroomId?: number) {

    const hasQuestions = !!testQuestionsIds.length

    const query = CONN.getRepository(School)
      .createQueryBuilder("school")
      .leftJoinAndSelect('school.classrooms', 'classrooms')
      .leftJoinAndSelect('classrooms.school', 'schoolClassrooms')
      .leftJoin('classrooms.studentClassrooms', 'studentClassroom')
      .addSelect(['studentClassroom.id', 'studentClassroom.rosterNumber', 'studentClassroom.endedAt'])
      .leftJoin("studentClassroom.student", "student")
      .addSelect(['student.id'])

      .leftJoinAndSelect("student.alphabeticFirst", "alphabeticFirst")
      .leftJoinAndSelect("alphabeticFirst.alphabeticFirst", "alphabeticFirstStudentLevel")

      .leftJoinAndSelect("student.alphabetic", "alphabetic")
      .leftJoinAndSelect("alphabetic.rClassroom", "alphabeticRClassroom")
      .leftJoinAndSelect("alphabetic.alphabeticLevel", "alphabeticLevel")
      .leftJoin("alphabetic.test", "alphaTest")
      .addSelect(['alphaTest.id', 'alphaTest.name'])
      .leftJoin("alphaTest.category", "alphaTestCategory")
      .leftJoin("alphaTest.discipline", "alphaTestDiscipline")
      .leftJoinAndSelect("alphaTest.period", "alphaTestPeriod")
      .leftJoinAndSelect("alphaTestPeriod.bimester", "alphaTestBimester")
      .leftJoin("alphaTestPeriod.year", "alphaTestYear")
      .addSelect(['alphaTestYear.id', 'alphaTestYear.name'])

      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .leftJoin("student.person", "person")
      .addSelect(['person.id', 'person.name'])
      .leftJoinAndSelect("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")

      .where(new Brackets(qb => {
        if(hasQuestions){
          qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
            .orWhere("alphabetic.id IS NOT NULL")
            .orWhere("studentQuestion.id IS NOT NULL")
        } else {
          qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
            .orWhere("alphabetic.id IS NOT NULL")
        }
      }))

      .andWhere("alphaTestDiscipline.id = :alphaTestDiscipline", { alphaTestDiscipline: test.discipline.id })
      .andWhere("alphaTestCategory.id = :testCategory", { testCategory: test.category.id })
      .andWhere("alphaTestYear.name = :yearName", { yearName })
      .andWhere("studentClassroomYear.name = :yearName", { yearName })
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .addOrderBy('classroom.shortName', 'ASC')
      .addOrderBy('school.shortName', 'ASC')

    if(hasQuestions) {
      query
        .leftJoinAndSelect("student.studentQuestions", "studentQuestion")
        .leftJoin("studentQuestion.rClassroom", "studentQuestionRClassroom")
        .addSelect(['studentQuestionRClassroom.id'])
        .leftJoin("studentQuestion.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
        .addSelect(['testQuestion.id', 'testQuestion.order', 'testQuestion.answer', 'testQuestion.active'])
        .leftJoin("testQuestion.questionGroup", "questionGroup")

        .leftJoin("testQuestion.test", "test")
        .addSelect(['test.id', 'test.name'])
        .leftJoin("test.category", "testCategory")
        .leftJoin("test.discipline", "testDiscipline")
        .leftJoinAndSelect("test.period", "period")
        .leftJoinAndSelect("period.bimester", "bimester")
        .addOrderBy("bimester.id", "ASC")
        .addOrderBy("testQuestion.order", "ASC")
        .leftJoin("period.year", "pYear")
        .addSelect(['pYear.id', 'pYear.name'])

        .andWhere("testCategory.id = :testCategory", { testCategory: test.category.id })
        .andWhere("testDiscipline.id = :testDiscipline", { testDiscipline: test.discipline.id })
        .andWhere("pYear.name = :yearName", { yearName })
    }

    if (classroomId) { query.andWhere("studentClassroom.classroom = :classroomId", { classroomId }) }

    return await query.getMany();
  }

  duplicatedStudents(studentClassrooms: StudentClassroom[]): any {
    const count = studentClassrooms.reduce((acc, item) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);
    const duplicatedStudents = studentClassrooms.filter(item => count[item.student.id] > 1).map(d => d.endedAt ? { ...d, ignore: true } : d)
    return studentClassrooms.map(item => { const duplicated = duplicatedStudents.find(d => d.id === item.id); return duplicated ? duplicated : item });
  }

  alphaAllClasses23(onlyClasses: Classroom[], headers: AlphaHeaders[]) {
    return onlyClasses.map(c => {

      let studentClassrooms = c.studentClassrooms.map(el =>
        ({ ...el, studentRowTotal: el.student.alphabetic.reduce((acc, curr) => acc + (curr.alphabeticLevel?.id ? 1 : 0), 0) })
      )

      studentClassrooms = this.duplicatedStudents(studentClassrooms)

      const allAlphabetic = studentClassrooms.filter((el: any) => !el.ignore).flatMap(el => el.student.alphabetic)

      const totals = headers.map(bim => {

        let bimesterCounter = 0;

        const studentClassroomsBi = studentClassrooms
          .filter((el: any) => !el.ignore)
          .filter(sc => sc.student.studentQuestions?.some(sq => (sq.rClassroom?.id === c.id) && (sq.testQuestion.test.period.bimester.id === bim.id) && (sq.answer && sq.answer != 'null' && sq.answer.length > 0 && sq.answer != '' && sq.answer != ' ')))

        const allStudentQuestions = studentClassroomsBi
          .flatMap(sc => sc.student.studentQuestions )

        const testQuestions = bim.testQuestions?.map(tQ => {

          if(!tQ.active) { return { ...tQ, counter: 0, counterPercentage: 0 } }

          const studentQuestions = allStudentQuestions.filter(sQ => { return sQ.testQuestion?.id === tQ?.id })

          const counter = studentQuestions.reduce((acc, sQ) => {

            if(sQ.rClassroom?.id != c.id){ return acc }

            if (sQ.rClassroom?.id === c.id && (sQ.answer && sQ.answer != 'null' && sQ.answer.length > 0 && sQ.answer != '' && sQ.answer != ' ') && tQ.answer?.includes(sQ.answer.toUpperCase())) { return acc + 1 } return acc
          }, 0)

          return { ...tQ, counter, counterPercentage: studentClassroomsBi.length, percentage: counter > 0 ? Math.floor((counter / studentClassroomsBi.length) * 10000) / 100: 0 }
        })

        const levels = bim.levels.map(lv => {

          const levelCounter = allAlphabetic.reduce((acc, prev) => {
            return acc + (prev.rClassroom?.id === c.id && prev.test.period.bimester.id === bim.id && prev.alphabeticLevel?.id === lv.id ? 1 : 0);
          }, 0)

          bimesterCounter += levelCounter
          return { ...lv, levelCounter }
        })

        return {
          ...bim,
          bimesterCounter,
          testQuestions: testQuestions,
          levels: levels.map((el: any) => ({ ...el, levelPercentage: bimesterCounter > 0 ? Math.floor((el.levelCounter / bimesterCounter) * 10000) / 100 : 0 }))
        }
      })

      return { id: c.id, name: c.name, shortName: c.shortName, school: c.school, totals }
    })
  }

  aggregateResult(aggregatedObjet: CityHall, allClassrooms: AllClassrooms[]) {
    return aggregatedObjet.totals.map(bi => {

      const biTotals = allClassrooms.flatMap(el => el.totals.filter(total => total.id === bi.id))
      const allBi = biTotals.flatMap(el => el.bimesterCounter).reduce((acc , prev) => { acc += (prev ?? 0); return acc }, 0)
      const allTq = biTotals.flatMap(el => el.testQuestions)
      const allLv = biTotals.flatMap(el => el.levels)

      return {
        ...bi,
        bimesterCounter: allBi,
        testQuestions: bi.testQuestions?.map((el: any) => {
          const counter = allTq.filter((tQ: any) => tQ?.id === el.id).reduce((acc: any, prev: any) => { acc += (prev?.counter ?? 0); return acc }, 0)
          const counterPercentage = allTq.filter((tQ: any) => tQ?.id === el.id).reduce((acc: any, prev: any) => { acc += (prev?.counterPercentage ?? 0); return acc }, 0)
          return { ...el, counter, counterPercentage, percentage: counter > 0 ? Math.floor((counter / counterPercentage) * 10000) / 100: 0 }
        }),
        levels: bi.levels.map((el: any) => {
          const levelCounter = allLv.filter((lv: any) => lv.id === el.id).reduce((acc: any, prev: any) => { acc += (prev.levelCounter ?? 0); return acc }, 0)
          return { ...el,  levelCounter, levelPercentage: allBi > 0 ? Math.floor((levelCounter / allBi) * 10000) / 100 : 0 }
        })
      }
    })
  }

  readingFluencyHeaders(preHeaders: ReadingFluencyGroup[]) {
    return preHeaders.reduce((acc: ReadingHeaders[], prev) => {
      let exam = acc.find(el => el.exam_id === prev.readingFluencyExam.id);
      if (!exam) {
        exam = {
          exam_id: prev.readingFluencyExam.id,
          exam_name: prev.readingFluencyExam.name,
          exam_color: prev.readingFluencyExam.color,
          exam_levels: []
        };
        acc.push(exam);
      }
      exam.exam_levels.push({
        level_id: prev.readingFluencyLevel.id,
        level_name: prev.readingFluencyLevel.name,
        level_color: prev.readingFluencyLevel.color
      });
      return acc;
    }, []);
  }

  cityHallResponse(baseClassroom: Classroom, allClasses: Classroom[]){
    const classroomNumber = baseClassroom.shortName.replace(/\D/g, "");
    const filteredClasses: Classroom[] = allClasses.filter(el => el.school.id === baseClassroom.school.id && el.shortName.replace(/\D/g, "") === classroomNumber)
    const cityHall: Classroom = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: { id: 99, name: 'ITATIBA', shortName: 'ITA', inep: null, active: true }, studentClassrooms: allClasses.flatMap(cl => cl.studentClassrooms)} as unknown as Classroom
    return [ ...filteredClasses, cityHall ]
  }

  alphaTotalizator(headers: AlphaHeaders[], classroom: Classroom) {

    const mappedArr = this.duplicatedStudents(classroom.studentClassrooms)
      .filter((el: any) => !el.ignore)
      .map((el: any) => ({
      currentClassroom: el.classroom.id,
      alphabetic: el.student.alphabetic.map((alphabeticItem: any) => ({
        rClassroomId: alphabeticItem.rClassroom?.id,
        bimesterId: alphabeticItem.test.period.bimester.id,
        alphabeticLevelId: alphabeticItem.alphabeticLevel?.id
      }))
    }))

    const totalNuColumn: any[] = []
    const perColumn = headers.reduce((acc, bimester) => { acc[bimester.id] = 0; return acc }, {} as Record<number, number>);

    for(let bimester of headers) {
      for(let level of bimester.levels) {
        let count = 0;
        for(let el of mappedArr) {
          count += el.alphabetic.reduce((sum: any, prev: any) => {
            return sum + (prev.rClassroomId === el.currentClassroom && prev.bimesterId === bimester.id && prev.alphabeticLevelId === level.id ? 1 : 0);
          }, 0)
        }
        totalNuColumn.push({ total: count, bimesterId: bimester.id });
        perColumn[bimester.id] += count;
      }
    }

    return totalNuColumn.map(el => {
      const totalPercent = perColumn[el.bimesterId];
      return totalPercent ? Math.floor((el.total / totalPercent) * 10000) / 100 : 0;
    })
  }

  readingFluencyTotalizator(headers: ReadingFluencyGroup[], classroom: Classroom){

    let totalNuColumn: any[] = []
    const percentColumn = headers.reduce((acc, prev) => { const key = prev.readingFluencyExam.id; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

    for(let header of headers) {

      const el = classroom.studentClassrooms.flatMap(studentClassroom => studentClassroom.student.readingFluency.filter(readingFluency => readingFluency.rClassroom?.id === studentClassroom.classroom.id && readingFluency.readingFluencyExam.id === header.readingFluencyExam.id && readingFluency.readingFluencyLevel?.id === header.readingFluencyLevel.id))

      const value = el.length ?? 0
      totalNuColumn.push({ total: value, divideByExamId: header.readingFluencyExam.id })
      percentColumn[header.readingFluencyExam.id] += value
    }

    return totalNuColumn.map((el: any) => Math.floor((el.total / percentColumn[el.divideByExamId]) * 10000) / 100)
  }

  diffs = (original: any, current: any): boolean => {
    if (original === current) return false;
    if (typeof original !== 'object' || original === null || current === null) return original !== current;
    const originalKeys = Object.keys(original);
    const currentKeys = Object.keys(current);
    if (originalKeys.length !== currentKeys.length) return true;
    for (let key of originalKeys) { if (!currentKeys.includes(key)) return true; if (this.diffs(original[key], current[key])) { return true } }
    return false;
  }
}

export const testController = new TestController();
