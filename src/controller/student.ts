import { GenericController } from "./genericController";
import {DeepPartial, EntityTarget, FindManyOptions, In, IsNull, ObjectLiteral, SaveOptions} from "typeorm";
import { Student } from "../model/Student";
import {AppDataSource} from "../data-source";
import {Person} from "../model/Person";
import {PersonCategory} from "../model/PersonCategory";
import {enumOfPersonCategory} from "../utils/enumOfPersonCategory";
import {StudentDisability} from "../model/StudentDisability";
import {Disability} from "../model/Disability";
import {State} from "../model/State";
import {StudentClassroom} from "../model/StudentClassroom";
import {Classroom} from "../model/Classroom";
import {Year} from "../model/Year";

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

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined) {
    try {

      const result = await this.repository.find({
        relations: ['person', 'studentClassrooms.classroom', 'studentDisabilities.disability' ]
      }) as Student[]

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: BodyStudent, options: SaveOptions | undefined) {
    try {

      const year = await this.getCurrentYear();
      const state = await this.getState(body.state);
      const classroom = await this.getClassroom(body.classroom);
      const category = await this.getStudentCategory();
      const person = this.newPerson(body, category);
      const disabilities = await this.getDisabilities(body.disabilities);

      const student = await this.repository.save(this.newStudent(body, person, state));

      if(!!disabilities.length) {
        await AppDataSource.getRepository(StudentDisability).save(disabilities.map(disability => {
          return { student, startedAt: new Date(), disability }
        }))
      }

      await AppDataSource.getRepository(StudentClassroom).save({ student,  classroom,  year,  rosterNumber: Number(body.rosterNumber),  startedAt: new Date() })

      return { status: 201, data: student };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getStudentCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({where: {id: enumOfPersonCategory.ALUNO}}) as PersonCategory
  }
  async getState(id: number) {
    return await AppDataSource.getRepository(State).findOne({where: {id: id}}) as State
  }
  async getClassroom(id: number) {
    return await AppDataSource.getRepository(Classroom).findOne({where: {id: id}}) as Classroom
  }
  async getCurrentYear() {
    return await AppDataSource.getRepository(Year).findOne({ where: { endedAt: IsNull(), active: true } } ) as Year
  }
  async getDisabilities(ids: number[]) {
    return await AppDataSource.getRepository(Disability).findBy({id: In(ids)})
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
