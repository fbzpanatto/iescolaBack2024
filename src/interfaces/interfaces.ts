import { PersonCategory } from "../model/PersonCategory";

export interface UserInterface { user: number, username: string, category: number, iat: number, exp: number }
export interface TeacherBody { name: string, email: string, register: number, birth: Date, teacherClasses: number[], teacherDisciplines: number[], classesName?: string[], disciplinesName?: string[], user: UserInterface, category: PersonCategory }
export interface TeacherResponse {id: number, person: {id: number, name: string, birth: string}, teacherClasses: number[], teacherDisciplines: number[]}

export interface SavePerson {
  name: string,
  birth: Date,
  category: PersonCategory,
}

export interface SaveStudent {
  name: string,
  birth: Date,
  disabilities: number[],
  disabilitiesName: string[],
  ra: string,
  dv: string,
  state: number,
  rosterNumber: string,
  classroom: number,
  classroomName: string,
  observationOne: string,
  observationTwo: string,
  user: UserInterface
}

export interface StudentClassroomReturn {
  id: number,
  rosterNumber: number | string,
  startedAt: Date,
  endedAt: Date,
  student: {
    id: number,
    ra: string,
    dv: string,
    state: {
      id: number,
      acronym: string,
    },
    person: {
      id: number,
      name: string,
      birth: Date,
    },
    transfer?: {
      id: number,
      startedAt: Date,
      status: {
        name: string,
      },
      requester: {
        name: string,
      }
    }
    disabilities: number[],
  },
  classroom: {
    id: number,
    shortName: string,
    teacher: {id: number, classrooms: number[]} | undefined,
    school: {
      id: number,
      shortName: string,
    }
  }
}
