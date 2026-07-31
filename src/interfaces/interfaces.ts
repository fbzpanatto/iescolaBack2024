import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Student } from "../model/Student";
import { Test } from "../model/Test";
import { School } from "../model/School";
import { Question } from "../model/Question";
import { QuestionGroup } from "../model/QuestionGroup";
import { Period } from "../model/Period";
import { AlphabeticLevel } from "../model/AlphabeticLevel";

export interface DeviceCheckResult { isMobile: boolean; confidence: 'high' | 'medium' | 'low'; reasons: string[]; userAgent: string; timestamp: Date }

export interface Data { status: number; data?: any; message?: any }
export interface JwtPayload { user: number; category: number; email?: string; ra?: string }
export type UserInterface = JwtPayload
export interface TeacherBody { name: string, email: string, register: any, birth: Date, teacherClasses: number[], teacherDisciplines: number[], classesName?: string[], disciplinesName?: string[], category: PersonCategory, teacherClassesDisciplines: qTeacherRelationShip[], school: number, observation: string }
export interface SavePerson {name: string,birth: Date,category: PersonCategory,}
export interface SaveStudent { name: string, birth: Date, disabilities: number[], disabilitiesName: string[], ra: string, dv: string,state: number,rosterNumber: string,classroom: number,classroomName: string,observationOne: string,observationTwo: string }
export interface StudentClassroomReturn {id: number,rosterNumber: number | string,startedAt: Date,endedAt: Date,student: { id: number, ra: string, dv: string, state: { id: number, acronym: string, }, person: { id: number, name: string, birth: Date, }, transfer?: { id: number, startedAt: Date, status: { name: string}, requester: {  name: string }, requestedClassroom: { classroom: string, school: string } }, disabilities: number[] }, classroom: { id: number, shortName: string, teacher: { id: number, classrooms: number[] } | undefined, school: { id: number, shortName: string }}}
export interface InactiveNewClassroom { student: Student; oldYear: number; newClassroom: { id: number; name: string; school: string }; oldClassroom: { id: number; name: string; school: string }; rosterNumber: number }
export interface StudentClassroomFnOptions { search?: string; year?: string; teacherClasses?: { id: number; classrooms: number[] }; owner?: string }
export interface TestBodySave { bimester: { id: number }, category: { id: number }, classroom: { id: number }[], discipline: { id: number }, name: string, endedAt: string, testQuestions?: { id: number, order: number, answer: string, questionGroup: { id: number, name: string }, active: boolean, question: { id: number, title: string, images: number, person: { id: number }, discipline: { id: number, name: string }, classroomCategory: { id: number, name: string }, skill: { id: number, reference: string, description: string } } }[], year: { id: number }, user: UserInterface }

export interface Totals { id: number, tNumber: number, tTotal: number, tRate: number }
export interface ReadingHeaders { exam_id: number, exam_name: string, exam_description: string, exam_color: string, exam_levels: { level_id: number, level_name: string, level_color: string, level_description: string }[] }
export interface AllClassrooms { id: number, name: string, shortName: string, school: School, totals: { bimesterCounter: number, testQuestions: { counter: number, counterPercentage: number, id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup } | {}[] | undefined, levels: any[], id: number, name: string, periods: Period[] }[] }
export interface CityHall { id: number, name: string, shortName: string, school: string, totals: { bimesterCounter: number, id: number, name: string, periods: Period[], levels: AlphabeticLevel[], testQuestions?: { id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup, counter?: number, counterPercentage?: number }[] }[] }
export interface AlphaHeaders { id: number, name: string, periods: Period[], levels: AlphabeticLevel[], testQuestions?: { id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup, counter?: number, counterPercentage?: number }[] }

export interface qStudentClassroomFormated { id: number, rosterNumber: number, classroomId: number, startedAt: string, endedAt: string | null, student: { id: number, person: { id: number, name: string }, readingFluency?: qReadingFluency[] }}
export interface qReadingFluenciesHeaders { id: number, readingFluencyLevelId: number, readingFluencyLevelName: string, readingFluencyExamDescription: string, readingFluencyLevelColor: string, readingFluencyExamId: number, readingFluencyExamName: string, readingFluencyExamColor: string, readingFluencyLevelDescription: string  }
export interface qTestQuestions { test_question_id: number, test_question_order: number, test_question_answer: string, test_question_active: boolean, question_id: number, question_images: number, question_title?: string, question_group_id: number, question_group_name: string, skill_id?: number, skill_reference?: string, skill_description?: string, question_skills?: string | null }
export interface qAlphaTests { test_id: number, test_active: number, discipline_id: number, discipline_name: string, test_category_id: number, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string, year_id: number, year_name: string }
export interface qAlphabeticLevels { id: number, shortName: string, color: string }
export interface qFormatedYear { id: number, name: string, periods: { id: number, bimester: { id: number, name: string, testName: string } }[] }
export interface qYear { id: number, name: string, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string, active: boolean, createdAt: string, endedAt: string }
export interface qStudentsClassroomsForTest { student_classroom_id: number, student_id: number, student_classroom_test_status_id: number, endedAt: string | null }
export interface qTransferStatus { id: number, name: string }
export interface qUserTeacher { id: number, email: string, school: { id: number }, register: string, person: { id: number, name: string, category: { id: number, name: string }, user: { id: number, username: string, email: string } } }
export interface qState { id: number, name: string, acronym: string }
export interface qClassroom { id: number, name: string, shortName: string, school_id: number, school_name: string, school_shortName: string }
export interface qUser { userId: number, categoryId: number }
export interface qTeacherClassrooms { id: number, classrooms: string, categoryId: number }
export interface qTeacherDisciplines { id: number, disciplines: string }
export interface qTestClassroom { testId: number, classroomId: number }
export interface qTest extends Test { id: number, name: string, active: boolean, createdAt: Date, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string, year_id: number, year_name: string, year_active: number | boolean, discipline_id: number, discipline_name: string, test_category_id: number, test_category_name: string, person_id: number, person_name: string }
export interface qSchools { id: number, name: string, shortName: string, classrooms: qClassrooms[] }
export interface qClassrooms { id: number, shortName: string, studentsClassrooms: qStudentClassroomFormated[] }
export interface qReadingFluency { id: number, readingFluencyExamId: number, readingFluencyLevelId: number, rClassroomId: number  }
export interface qTeacherRelationShip { id: number, teacherId: number, classroomId: number, disciplineId: number, classroomName: string, schoolName: string, disciplineName: string, active: boolean, contract: number | null, endedAt: any, startedAt: any }
export interface qStudentTests { studentClassroomId: number,studentId: number,studentName: string,testId: number,testName: string,bimesterName: string,bimesterTestName: string,yearName: string, classroomId: string, classroomName: string, schoolName: string, testCategoryId: number, ra: string, dv: string }
export interface qPendingTransfers { name: string, ra: string, dv: number | string, requestedClassroom: string, requestedSchool: string, status: string, currentClassroom: string, currentSchool: string }
export interface TrainingAndSchedulesBody { id?: number, name: string, category: number, categoryName?: string, month: number, monthName?: string, meeting: number, meetingName?: string, discipline?: number, disciplineName?: string, classroom?: number, classroomName?: string, observation?: string }
export interface TrainingScheduleResult { id: number | null, trainingId: number | null, dateTime: string, active: boolean }
export interface TrainingResult { id: number, classroom: number,  observation: string | null,  discipline: number | null, disciplineName?: string | null, category: number, month: number, meeting: number, trainingSchedules: TrainingScheduleResult[] }
export interface Training { id: number, classroom: number, observation: string | null, createdByUser: number, updatedByUser: number, categoryId: number, monthReferenceId: number, meetingId: number, yearId: number, disciplineId: number | null }
export interface TestByStudentId { studentTestStatusId: number, active: boolean, studentClassroomId: number, studentId: number, testId: number, testName: string, bimesterName: string, yearName: string, classroomId?: number, classroomName: string, schoolName: string, discipline: string }
export interface TrainingWithSchedulesResult { id: number, classroom: number, category: { id: number, name: string }, year: { id: number, name: string }, meeting: { id: number, name: string }, month: { id: number, name: string }, discipline: { id: number, name: string } | null, trainingSchedules: Array<{ id: number, dateTime: string, active: boolean }> }
export interface TeacherParam { id: number; name: string; disciplineId?: number | null; discipline: string; contract?: number | null; classroom?: number | string; schoolId: number; shortName: string; isHeadquarterSchool?: number;trainingTeachers?: { id: number; teacherId: number; trainingId: number; statusId: number | string; observation?: string | null }[] }
export interface UpdateStudentAnswers { testId: number, studentId: number | string, questions: { studentQuestionId: number, answer: string, testQuestionId: number, studentId: number, rClassroomId: number | null }[], token: { id: number, code: string } }
export interface qTestToken { id: number, code: string, leftUses: number, createdAt: string, expiresAt: string, test: string, bimester: string, discipline: string, teacher: string, classroom: string, school: string }

export interface QuestionImageJson {
  id: number
  type: 'main' | 'support'
  order: number
  s3Key: string
}

export interface qTestQuestionsWithImages {
  test_question_id: number
  test_question_order: number
  test_question_answer: string
  test_question_active: boolean
  question_id: number
  question_images: string | null // JSON string agregado pelo MySQL (JSON_ARRAYAGG), ainda não parseado
  question_title?: string
  question_group_id: number
  question_group_name: string
  skill_id?: number
  skill_reference?: string
  skill_description?: string
  question_skills?: string | null
}

export interface TestQuestionWithImages {
  id: number
  order: number
  answer: string
  active: boolean
  question: {
    id: number
    title?: string
    images: QuestionImageJson[]
    skill: { reference?: string, description?: string }
    skills: Array<{ id: number, reference: string, description: string }>
  }
  questionGroup: { id: number, name: string }
}

export interface qTestQuestionsFull {
  test_question_id: number
  test_question_order: number
  test_question_answer: string
  test_question_active: boolean
  question_id: number
  question_title: string
  question_person_id: number | null
  question_discipline_id: number | null
  question_discipline_name: string | null
  question_classroom_category_id: number | null
  question_classroom_category_name: string | null
  question_images: string | null // JSON string agregado pelo MySQL (JSON_ARRAYAGG), ainda não parseado
  question_in_use: number
  question_group_id: number
  question_group_name: string
  skill_id: number | null
  skill_reference: string | null
  skill_description: string | null
  question_skills: string | null
}

export interface qTestByIdRow {
  id: number
  name: string
  active: number
  hideAnswers: number
  createdAt: string | null
  updatedAt: string | null
  createdByUser: number | null
  updatedByUser: number | null
  endedAt: string | null
  period_id: number | null
  year_id: number | null
  year_name: string | null
  year_active: number | null
  year_createdAt: string | null
  year_endedAt: string | null
  bimester_id: number | null
  bimester_name: string | null
  bimester_testName: string | null
  discipline_id: number | null
  discipline_name: string | null
  category_id: number | null
  category_name: string | null
  category_startClassroomNumber: number | null
  category_endClassroomNumber: number | null
  person_id: number | null
  person_name: string | null
  person_birth: string | null
  classroom_id: number | null
  classroom_name: string | null
  classroom_nickname: string | null
  classroom_shortName: string | null
  school_id: number | null
  school_name: string | null
  school_shortName: string | null
  school_inep: string | null
  school_active: number | null
}

// Forma equivalente ao antigo TestController#getTestQuestions (TypeORM) — usado só no
// fluxo de edição (getById/updateTest). Diferente de TestQuestionWithImages, que serve
// o fluxo do aluno (studentTestController) e nunca expõe `answer`.
export interface TestQuestionFull {
  id: number
  order: number
  answer: string
  active: boolean
  question: {
    id: number
    title: string
    person: { id: number } | null
    discipline: { id: number, name: string } | null
    classroomCategory: { id: number, name: string } | null
    skill: { id: number, reference: string, description: string } | null
    skills: Array<{ id: number, reference: string, description: string }>
    questionImages: QuestionImageJson[]
    inUse: number
  }
  questionGroup: { id: number, name: string }
}