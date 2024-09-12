import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Student } from "../model/Student";

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
