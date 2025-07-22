import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Student } from "../model/Student";
import { Test } from "../model/Test";
import { ObjectLiteral } from "typeorm";
import { School } from "../model/School";
import { Question } from "../model/Question";
import { QuestionGroup } from "../model/QuestionGroup";
import { Period } from "../model/Period";
import { AlphabeticLevel } from "../model/AlphabeticLevel";

export interface Data { status: number; data?: any; message?: any }
export interface UserInterface { user: number, email: string, username: string, category: number, iat: number, exp: number }
export interface TeacherBody { name: string, email: string, register: any, birth: Date, teacherClasses: number[], teacherDisciplines: number[], classesName?: string[], disciplinesName?: string[], user: UserInterface, category: PersonCategory, teacherClassesDisciplines: qTeacherRelationShip[], school: number, observation: string }
export interface SavePerson {name: string,birth: Date,category: PersonCategory,}
export interface SaveStudent { name: string, birth: Date, disabilities: number[], disabilitiesName: string[], ra: string, dv: string,state: number,rosterNumber: string,classroom: number,classroomName: string,observationOne: string,observationTwo: string,user: UserInterface }
export interface StudentClassroomReturn {id: number,rosterNumber: number | string,startedAt: Date,endedAt: Date,student: { id: number, ra: string, dv: string, state: { id: number, acronym: string, }, person: { id: number, name: string, birth: Date, }, transfer?: { id: number, startedAt: Date, status: { name: string}, requester: {  name: string }, requestedClassroom: { classroom: string, school: string } }, disabilities: number[] }, classroom: { id: number, shortName: string, teacher: { id: number, classrooms: number[] } | undefined, school: { id: number, shortName: string }}}
export interface GraduateBody  { user: UserInterface; student: { id: number; active: boolean; classroom: Classroom }; year: number }
export interface InactiveNewClassroom { student: Student; oldYear: number; newClassroom: { id: number; name: string; school: string }; oldClassroom: { id: number; name: string; school: string }; user: { user: number; username: string; category: number }, rosterNumber: number }
export interface StudentClassroomFnOptions { search?: string; year?: string; teacherClasses?: { id: number; classrooms: number[] }; owner?: string }
export interface TestBodySave { bimester: { id: number }, category: { id: number }, classroom: { id: number }[], discipline: { id: number }, name: string, testQuestions?: {}[], year: { id: number }, user: UserInterface }

export interface Totals { id: number, tNumber: number, tTotal: number, tRate: number }
export interface insertStudentsBody { user: ObjectLiteral, studentClassrooms: number[], test: { id: number  }, year: number, classroom: { id: number }}
export interface notIncludedInterface { id: number, rosterNumber: number, startedAt: Date, endedAt: Date, name: string, ra: number, dv: number }
export interface ReadingHeaders { exam_id: number, exam_name: string, exam_color: string, exam_levels: { level_id: number, level_name: string, level_color: string }[] }
export interface AllClassrooms { id: number, name: string, shortName: string, school: School, totals: { bimesterCounter: number, testQuestions: { counter: number, counterPercentage: number, id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup } | {}[] | undefined, levels: any[], id: number, name: string, periods: Period[] }[] }
export interface CityHall { id: number, name: string, shortName: string, school: string, totals: { bimesterCounter: number, id: number, name: string, periods: Period[], levels: AlphabeticLevel[], testQuestions?: { id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup, counter?: number, counterPercentage?: number }[] }[] }
export interface AlphaHeaders { id: number, name: string, periods: Period[], levels: AlphabeticLevel[], testQuestions?: { id: number, order: number, answer: string, active: boolean, question: Question, questionGroup: QuestionGroup, counter?: number, counterPercentage?: number }[] }

export interface qStudentClassroomFormated { id: number, rosterNumber: number, classroomId: number, startedAt: string, endedAt: string | null, student: { id: number, person: { id: number, name: string }, readingFluency?: qReadingFluency[] }}
export interface qReadingFluenciesHeaders { id: number, readingFluencyLevelId: number, readingFluencyLevelName: string, readingFluencyLevelColor: string, readingFluencyExamId: number, readingFluencyExamName: string, readingFluencyExamColor: string  }
export interface qAlphaStudentsFormated { id: number, rosterNumber: number, startedAt: string, endedAt: string | null, student: { id: number, active: boolean, person: { id: number, name: string }, alphabetic: { id: number, alphabeticLevelId: number, rClassroomId: number, bimesterId: number }[], studentDisabilities?: { id: number, startedAt: string, endedAt: string | null }[] }}
export interface qTestQuestions { test_question_id: number, test_question_order: number, test_question_answer: string, test_question_active: boolean, question_id: number, question_group_id: number, question_group_name: string, skill_id?: number, skill_reference?: string, skill_description?: string }
export interface qAlphaTests { test_id: number, test_active: number, discipline_id: number, discipline_name: string, test_category_id: number, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string, year_id: number, year_name: string }
export interface qAlphabeticLevels { id: number, shortName: string, color: string }
export interface qFormatedYear { id: number, name: string, periods: { id: number, bimester: { id: number, name: string, testName: string } }[] }
export interface qYear { id: number, name: string, period_id: number, bimester_id: number, bimester_name: string, bimester_testName: string, active: boolean, createdAt: string, endedAt: string }
export interface qStudentsClassroomsForTest { student_classroom_id: number, student_id: number, student_classroom_test_status_id: number }
export interface qAlphaStuClassroomsFormated { id: number, rosterNumber: number, startedAt: string, endedAt: string, student: { id: number, person: { id: number, name: string } } }
export interface qAlphaStuClassrooms { id: number, rosterNumber: number, startedAt: string, endedAt: string, student_id: number, person_id: number, person_name: string, alphabetic_id: number, alphabeticLevel: number, test_id: number }
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
export interface qTeacherRelationShip { id: number, teacherId: number, classroomId: number, disciplineId: number, classroomName: string, schoolName: string, disciplineName: string, active: boolean  }
export interface qStudentTests { studentClassroomId: number,studentId: number,studentName: string,testId: number,testName: string,bimesterName: string,bimesterTestName: string,yearName: string, classroomId: string, classroomName: string, schoolName: string, testCategoryId: number, ra: string, dv: string }
export interface qPendingTransfers { name: string, ra: string, dv: number | string, requestedClassroom: string, requestedSchool: string, status: string, currentClassroom: string, currentSchool: string }
export interface TrainingAndSchedulesBody { id?: number, name: string, category: number, categoryName?: string, month: number, monthName?: string, meeting: number, meetingName?: string, discipline?: number, disciplineName?: string, classroom: number, classroomName?: string, trainingSchedules: TrainingScheduleResult[], observation?: string, user: UserInterface }
export interface TrainingScheduleResult { id: number | null, trainingId: number | null, dateTime: string, active: boolean }
export interface TrainingResult { id: number, classroom: number,  observation: string | null,  discipline: number | null, disciplineName?: string | null, category: number, month: number, meeting: number, trainingSchedules: TrainingScheduleResult[] }
export interface Training { id: number, classroom: number, observation: string | null, createdByUser: number, updatedByUser: number, categoryId: number, monthReferenceId: number, meetingId: number, yearId: number, disciplineId: number | null }

export interface TrainingWithSchedulesResult {
  id: number;
  classroom: number;
  category: {
    id: number;
    name: string;
  };
  year: {
    id: number;
    name: string;
  };
  meeting: {
    id: number;
    name: string;
  };
  month: {
    id: number;
    name: string;
  };
  discipline: {
    id: number;
    name: string;
  } | null;
  trainingSchedules: Array<{
    id: number;
    dateTime: string;
    active: boolean;
  }>;
}
