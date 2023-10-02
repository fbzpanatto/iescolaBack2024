import { GenericController } from "./genericController";
import {DeepPartial, EntityTarget, In, ObjectLiteral, SaveOptions} from "typeorm";
import { Student } from "../model/Student";
import {AppDataSource} from "../data-source";
import {Person} from "../model/Person";
import {PersonCategory} from "../model/PersonCategory";
import {enumOfPersonCategory} from "../utils/enumOfPersonCategory";
import {Teacher} from "../model/Teacher";
import {disabilityController} from "./disability";
import {StudentDisability} from "../model/StudentDisability";
import {Disability} from "../model/Disability";
import {State} from "../model/State";

interface BodyStudent {
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
}

class StudentController extends GenericController<EntityTarget<Student>> {
  constructor() {
    super(Student);
  }

  override async save(body: BodyStudent, options: SaveOptions | undefined) {
    try {

      const state = await this.getState(body.state);
      const category = await this.getStudentCategory();
      const person = this.newPerson(body, category);
      const student = await this.repository.save(this.newStudent(body, person, state));

      const disabilities = await AppDataSource.getRepository(Disability).findBy({id: In(body.disabilities)})
      if(!!disabilities.length) {
        await AppDataSource.getRepository(StudentDisability).save(disabilities.map(disability => {
          return { disability: disability, student: student, startedAt: new Date() }
        }))
      }

      // TODO: SAVE STUDENT_CLASSROOM

      return { status: 201, data: student };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getStudentCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({where: {id: enumOfPersonCategory.ALUNO}}) as PersonCategory
  }
  async getState(id: number) {
    return await AppDataSource.getRepository(State).findOne({where: {id: id}}) as State
  }

  newPerson(body: BodyStudent, category: PersonCategory) {
    const person = new Person()
    person.name = body.name;
    person.birth = body.birth;
    person.category = category
    return person
  }
  newStudent(body: BodyStudent, person: Person, state: State) {

    const student = new Student()
    student.person = person
    student.ra = body.ra
    student.dv = body.dv
    student.state = state
    return student
  }
}

export const studentController = new StudentController();
