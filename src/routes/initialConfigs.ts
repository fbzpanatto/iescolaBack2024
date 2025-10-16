import { Request, Router } from "express";
import { dataSourceController } from "../controller/initialConfigs";
import { Year } from "../model/Year";
import { Bimester } from "../model/Bimester";
import { School } from "../model/School";
import { Classroom } from "../model/Classroom";
import { ClassroomCategory } from "../model/ClassroomCategory";
import { Period } from "../model/Period";
import { BIMESTER } from "../mock/bimester";
import { DISABILITY } from "../mock/disability";
import { CLASSROOM_CATEGORY } from "../mock/classroomCategory";
import { SCHOOLS } from "../mock/school";
import { CLASSROOM } from "../mock/classroom";
import { DISCIPLINE } from "../mock/discipline";
import { Discipline } from "../model/Discipline";
import { PersonCategory } from "../model/PersonCategory";
import { PERSON_CATEGORY } from "../mock/personCategory";
import { STATES } from "../mock/state";
import { State } from "../model/State";
import { Disability } from "../model/Disability";
import { TransferStatus } from "../model/TransferStatus";
import { TRANSFER_STATUS } from "../mock/transferStatus";
import { User } from "../model/User";
import { Person } from "../model/Person";
import { TestCategory } from "../model/TestCategory";
import { TESTCATEGORY } from "../mock/testCategory";
import { QUESTION_GROUP } from "../mock/questionGroup";
import { QuestionGroup } from "../model/QuestionGroup";
import { Teacher } from "../model/Teacher";
import { PERSON_CATEGORIES } from "../utils/enums";
import { generatePassword } from "../utils/generatePassword";
import { credentialsEmail } from "../services/email";
import { ReadingFluencyExam } from "../model/ReadingFluencyExam";
import { ReadingFluencyLevel } from "../model/ReadingFluencyLevel";
import { ReadingFluencyGroup } from "../model/ReadingFluencyGroup";
import { READINGFLUENCYEXAM } from "../mock/readingFluencyExam";
import { READINGFLUENCYLEVEL } from "../mock/readingFluencyLevel";
import { READINGFLUENCYGROUP } from "../mock/readingFluencyGroup";

export const InitialConfigsRouter = Router();

async function createClassroom(school: School, classroom: {name: string, shortName: string, active: boolean, category: number}) {

  const classCategorySource = new dataSourceController(ClassroomCategory).entity
  const classSource = new dataSourceController(Classroom).entity

  const classCategory = await classCategorySource.findOneBy({ id: classroom.category }) as ClassroomCategory
  const newClass = new Classroom()
  newClass.name = classroom.name
  newClass.category = classCategory
  newClass.school = school
  newClass.active = classroom.active
  newClass.shortName = classroom.shortName
  return await classSource.save(newClass) as Classroom
}

async function createAdminUser(person: Person) {

  const passObject: { password: string, hashedPassword: string } = generatePassword()

  const userSource = new dataSourceController(User).entity
  const user = new User()
  user.username = 'appescola7@gmail.com'
  user.email = 'appescola7@gmail.com'
  user.password = passObject.hashedPassword
  user.person = person

  await credentialsEmail(user.email, passObject.password, true)

  await userSource.save(user)
}

async function createAdminPerson() {
  const adminCategorySource = new dataSourceController(PersonCategory).entity
  const adminCategory = await adminCategorySource.findOneBy({ id: PERSON_CATEGORIES.ADMN }) as PersonCategory
  const personSource = new dataSourceController(Person).entity
  const person = new Person()
  person.name = 'Administrador'
  person.birth = new Date()
  person.category = adminCategory

  const result = await personSource.save(person)
  const teacherSource = new dataSourceController(Teacher).entity
  const teacher = new Teacher()
  teacher.person = result
  teacher.email = 'appescola7@gmail.com'
  teacher.createdAt = new Date()
  teacher.updatedAt = new Date()
  teacher.createdByUser = 1
  teacher.updatedByUser = 1
  teacher.register = 'ADMN - 0001'
  await teacherSource.save(teacher)
  await createAdminUser(result)
}

InitialConfigsRouter.get('/', async (req: Request, res: any) => {
  try {
    const personCategorySource = new dataSourceController(PersonCategory).entity
    const bimesterSource = new dataSourceController(Bimester).entity
    const transferStatusSource = new dataSourceController(TransferStatus).entity
    const schoolSource = new dataSourceController(School).entity
    const periodSource = new dataSourceController(Period).entity
    const classCategorySource = new dataSourceController(ClassroomCategory).entity
    const disciplineSource = new dataSourceController(Discipline).entity
    const stateSource = new dataSourceController(State).entity
    const disabilitySource = new dataSourceController(Disability).entity
    const testCategorySource = new dataSourceController(TestCategory).entity
    const questionGroupSource = new dataSourceController(QuestionGroup).entity
    const readingFluencyExamSource = new dataSourceController(ReadingFluencyExam).entity
    const readingFluencyLevelSource = new dataSourceController(ReadingFluencyLevel).entity
    const readingFluencyGroupSource = new dataSourceController(ReadingFluencyGroup).entity

    const currentYear = new Date().getFullYear()
    const date = new Date(currentYear, 0, 1, 0, 0 ,0, 0)

    const newYear = new Year()
    newYear.name = date.getFullYear().toString()
    newYear.active = true
    newYear.createdAt = date

    for(let questionGroup of QUESTION_GROUP) {
      const newQuestionGroup = new QuestionGroup()
      newQuestionGroup.createdAt = new Date()
      newQuestionGroup.createdByUser = 1
      newQuestionGroup.updatedAt = new Date()
      newQuestionGroup.updatedByUser = 1
      newQuestionGroup.name = questionGroup.name
      await questionGroupSource.save(newQuestionGroup)
    }

    for(let disability of DISABILITY) {
      const newDisability = new Disability()
      newDisability.name = disability.name
      newDisability.createdAt = new Date()
      newDisability.createdByUser = 1
      newDisability.updatedAt = new Date()
      newDisability.updatedByUser = 1
      await disabilitySource.save(newDisability)
    }

    for(let testCategory of TESTCATEGORY) {
      const newTestCategory = new TestCategory()
      newTestCategory.name = testCategory.name
      await testCategorySource.save(newTestCategory)
    }

    for(let bimester of BIMESTER) {
      const newBimester = new Bimester()
      newBimester.name = bimester.name
      await bimesterSource.save(newBimester)
    }

    for(let status of TRANSFER_STATUS) {
      const newStatus = new TransferStatus()
      newStatus.name = status.name
      await transferStatusSource.save(newStatus)
    }

    for(let state of STATES) {
      const newState = new State()
      newState.name = state.name
      newState.acronym = state.acronym
      await stateSource.save(newState)
    }

    const bimesters = await bimesterSource.find() as Bimester[]

    for(let bimester of bimesters) {
      const period = new Period();
      period.year = newYear  as Year;
      period.bimester = bimester;

      await periodSource.save(period)
    }

    for(let classroomCategory of CLASSROOM_CATEGORY) {
      const newClassCategory = new ClassroomCategory()
      newClassCategory.name = classroomCategory.name
      newClassCategory.active = classroomCategory.active
      newClassCategory.createdAt = new Date()
      newClassCategory.createdByUser = 1
      newClassCategory.updatedAt = new Date()
      newClassCategory.updatedByUser = 1
      await classCategorySource.save(newClassCategory)
    }

    for(let school of SCHOOLS) {
      const newSchool = new School()
      newSchool.name = school.name
      newSchool.shortName = school.shortName
      newSchool.active = school.active
      await schoolSource.save(newSchool)
    }

    const schools = await schoolSource.find() as School[]

    for(let school of schools) {
      for(let classroom of CLASSROOM) {
        await createClassroom(school, classroom)
      }
    }

    for(let discipline of DISCIPLINE) {
      const newDiscipline = new Discipline()
      newDiscipline.name = discipline.name
      newDiscipline.active = discipline.active
      newDiscipline.shortName = discipline.shortName
      await disciplineSource.save(newDiscipline)
    }

    for(let personCategory of PERSON_CATEGORY) {
      const newPersonCategory = new PersonCategory()
      newPersonCategory.name = personCategory.name
      newPersonCategory.active = personCategory.active
      await personCategorySource.save(newPersonCategory)
    }

    for(let element of READINGFLUENCYEXAM) {
      const el = new ReadingFluencyExam()
      el.name = element.name
      el.color = element.color
      await readingFluencyExamSource.save(el)
    }

    for(let element of READINGFLUENCYLEVEL) {
      const el = new ReadingFluencyLevel()
      el.name = element.name
      el.color = element.color
      await readingFluencyLevelSource.save(el)
    }

    for(let element of READINGFLUENCYGROUP) {
      const el = new ReadingFluencyGroup()
      el.readingFluencyExam = await readingFluencyExamSource.findOneBy({ id: element.readingFluencyExam.id }) as  ReadingFluencyExam
      el.readingFluencyLevel = await readingFluencyLevelSource.findOneBy({ id: element.readingFluencyLevel.id }) as ReadingFluencyLevel
      await readingFluencyGroupSource.save(el)
    }

    await createAdminPerson()

    return res.status(200).json({ message: 'Configurações iniciais criadas com sucesso!' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Erro ao criar configurações iniciais!' })
  }
})
