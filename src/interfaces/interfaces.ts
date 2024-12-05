import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Student } from "../model/Student";
import {Test} from "../model/Test";

export interface Data { status: number; data?: any; message?: any }
export interface UserInterface { user: number, email: string, username: string, category: number, iat: number, exp: number }
export interface TeacherBody { name: string, email: string, register: any, birth: Date, teacherClasses: number[], teacherDisciplines: number[], classesName?: string[], disciplinesName?: string[], user: UserInterface, category: PersonCategory }
export interface TeacherResponse {id: number, person: {id: number, name: string, birth: string}, teacherClasses: number[], teacherDisciplines: number[]}
export interface SavePerson {name: string,birth: Date,category: PersonCategory,}
export interface SaveStudent { name: string, birth: Date, disabilities: number[], disabilitiesName: string[], ra: string, dv: string,state: number,rosterNumber: string,classroom: number,classroomName: string,observationOne: string,observationTwo: string,user: UserInterface }
export interface StudentClassroomReturn {id: number,rosterNumber: number | string,startedAt: Date,endedAt: Date,student: { id: number, ra: string, dv: string, state: { id: number, acronym: string, }, person: { id: number, name: string, birth: Date, }, transfer?: { id: number, startedAt: Date, status: { name: string}, requester: {  name: string }, requestedClassroom: { classroom: string, school: string } }, disabilities: number[] }, classroom: { id: number, shortName: string, teacher: { id: number, classrooms: number[] } | undefined, school: { id: number, shortName: string }}}
export interface GraduateBody  { user: UserInterface; student: { id: number; active: boolean; classroom: Classroom }; year: number }
export interface InactiveNewClassroom { student: Student; oldYear: number; newClassroom: { id: number; name: string; school: string }; oldClassroom: { id: number; name: string; school: string }; user: { user: number; username: string; category: number } }
export interface StudentClassroomFnOptions { search?: string; year?: string; teacherClasses?: { id: number; classrooms: number[] }; owner?: string }
export interface TestBodySave { bimester: { id: number }, category: { id: number }, classroom: { id: number }[], discipline: { id: number }, name: string, testQuestions?: {}[], year: { id: number }, user: UserInterface }

export interface QueryReadingFluenciesHeaders { id: number, readingFluencyLevelId: number, readingFluencyLevelName: string, readingFluencyLevelColor: string, readingFluencyExamId: number, readingFluencyExamName: string, readingFluencyExamColor: string  }
export interface QueryAlphaStudentsFormated { id: number, rosterNumber: number, startedAt: string, endedAt: string | null, student: { id: number, active: boolean, person: { id: number, name: string }, alphabetic: { id: number, alphabeticLevelId: number, rClassroomId: number }[], studentDisabilities?: { id: number, startedAt: string, endedAt: string | null }[] }}
export interface QueryAlphaStudents { id: number, rosterNumber: number, startedAt: string, endedAt: string | null, studentId: number, active: boolean, personId: number, name: string, alphabeticId: number, alphabeticLevelId: number, rClassroomId: number }
export interface QueryTestQuestions { test_question_id: number, test_question_order: number, test_question_answer: string, test_question_active: boolean, question_id: number, question_group_id: number, question_group_name: string }
export interface QueryAlphaTests { test_id: number, test_active: number, discipline_id: number, discipline_name: string, test_category_id: number, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string, year_id: number, year_name: string }
export interface QueryAlphabeticLevels { id: number, shortName: string, color: string }
export interface QueryFormatedYear { id: number, name: string, periods: { id: number, bimester: { id: number, name: string, testName: string } }[] }
export interface QueryYear { id: number, name: string, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string }
export interface QueryStudentsClassroomsForTest { student_classroom_id: number, student_id: number, student_classroom_test_status_id: number }
export interface QueryAlphaStuClassroomsFormated { id: number, rosterNumber: number, startedAt: string, endedAt: string, student: { id: number, person: { id: number, name: string } } }
export interface QueryAlphaStuClassrooms { id: number, rosterNumber: number, startedAt: string, endedAt: string, student_id: number, person_id: number, person_name: string, alphabetic_id: number, alphabeticLevel: number, test_id: number }
export interface QueryYear { id: number, name: string, active: boolean, createdAt: string, endedAt: string }
export interface QueryTransferStatus { id: number, name: string }
export interface QueryUserTeacher { id: number, email: string, register: string, person: { id: number, name: string, category: { id: number, name: string }, user: { id: number, username: string, email: string } } }
export interface QueryState { id: number, name: string, acronym: string }
export interface QueryClassroom { id: number, name: string, shortName: string, school_id: number, school_name: string, school_shortName: string }
export interface QueryUser { userId: number, categoryId: number }
export interface QueryTeacherClassrooms { id: number, classrooms: string }
export interface QueryTeacherDisciplines { id: number, disciplines: string }
export interface QueryTestClassroom { testId: number, classroomId: number }
export interface QueryYear { id: number, name: string }
export interface QueryTest extends Test { id: number, name: string, active: boolean, createdAt: Date, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string, year_id: string, year_name: string, year_active: number | boolean, discipline_id: number, discipline_name: string, test_category_id: number, test_category_name: string, person_id: number, person_name: string }
export interface QuerySchools { id: number, name: string, shortName: string, classrooms: QueryClassrooms[] }
export interface QueryClassrooms { id: number, shortName: string, studentsClassrooms: QueryStudentClassrooms[] }
export interface QueryStudentClassrooms { id: number, studentId: number, classroomId: number, name: string, yearId: number, endedAt: string, readingFluency?: QueryReadingFluency[] }
export interface QueryReadingFluency { id: number, readingFluencyExamId: number, readingFluencyLevelId: number, rClassroomId: number  }
