import { GenericController } from "./genericController";
import { EntityTarget, In, IsNull, ObjectLiteral } from "typeorm";
import { Student } from "../model/Student";
import { AppDataSource } from "../data-source";
import { Person } from "../model/Person";
import { PersonCategory } from "../model/PersonCategory";
import { enumOfPersonCategory } from "../utils/enumOfPersonCategory";
import { StudentDisability } from "../model/StudentDisability";
import { Disability } from "../model/Disability";
import { State } from "../model/State";
import { StudentClassroom } from "../model/StudentClassroom";
import { Classroom } from "../model/Classroom";
import { Year } from "../model/Year";

interface StudentClassroomReturn {
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
    disabilities: number[],
  },
  classroom: {
    id: number,
    shortName: string,
    school: {
      id: number,
      shortName: string,
    }
  }
}
interface SaveStudent {
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

  override async findAllWhere() {
    try {
      const studentsClassrooms = await this.studentsClassrooms({}) as StudentClassroomReturn[]
      return { status: 200, data: studentsClassrooms };
    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
  }
  override async findOneById(id: string | number) {
    try {
      const result = await this.studentClassroom(Number(id));
      if (!result) { return { status: 404, message: 'Data not found' } }
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  override async save(body: SaveStudent) {
    try {
      const year = await this.currentYear();
      const state = await this.state(body.state);
      const classroom = await this.classroom(body.classroom);
      const category = await this.studentCategory();
      const person = this.newPerson(body, category);
      const disabilities = await this.disabilities(body.disabilities);
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
  async studentCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({where: {id: enumOfPersonCategory.ALUNO}}) as PersonCategory
  }
  // TODO: move to utils
  async state(id: number) {
    return await AppDataSource.getRepository(State).findOne({where: {id: id}}) as State
  }
  // TODO: move to utils
  async currentYear() {
    return await AppDataSource.getRepository(Year).findOne({ where: { endedAt: IsNull(), active: true } } ) as Year
  }
  async classroom(id: number) {
    return await AppDataSource.getRepository(Classroom).findOne({where: {id: id}}) as Classroom
  }
  async disabilities(ids: number[]) {
    return await AppDataSource.getRepository(Disability).findBy({id: In(ids)})
  }
  async studentClassroom(studentId: number) {

    const preResult = await AppDataSource
      .createQueryBuilder()
      .select([
        'studentClassroom.id',
        'studentClassroom.rosterNumber',
        'studentClassroom.startedAt',
        'studentClassroom.endedAt',
        'student.id',
        'student.ra',
        'student.dv',
        'student.observationOne',
        'student.observationTwo',
        'state.id',
        'state.acronym',
        'person.id',
        'person.name',
        'person.birth',
        'classroom.id',
        'classroom.shortName',
        'school.id',
        'school.shortName',
        'GROUP_CONCAT(DISTINCT disability.id ORDER BY disability.id ASC) AS disabilities',
      ])
      .from(StudentClassroom, 'studentClassroom')
      .leftJoin('studentClassroom.student', 'student')
      .leftJoin('student.person', 'person')
      .leftJoin('student.studentDisabilities', 'studentDisabilities')
      .leftJoin('studentDisabilities.disability', 'disability')
      .leftJoin('student.state', 'state')
      .leftJoin('studentClassroom.classroom', 'classroom')
      .leftJoin('classroom.school', 'school')
      .leftJoin('studentClassroom.year', 'year')
      .where('student.id = :studentId', { studentId })
      .groupBy('studentClassroom.id')
      .getRawOne();

    return {
      id: preResult.studentClassroom_id,
      rosterNumber: preResult.studentClassroom_rosterNumber,
      startedAt: preResult.studentClassroom_startedAt,
      endedAt: preResult.studentClassroom_endedAt,
      student: {
        id: preResult.student_id,
        ra: preResult.student_ra,
        dv: preResult.student_dv,
        observationOne: preResult.student_observationOne,
        observationTwo: preResult.student_observationTwo,
        state: {
          id: preResult.state_id,
          acronym: preResult.state_acronym,
        },
        person: {
          id: preResult.person_id,
          name: preResult.person_name,
          birth: preResult.person_birth,
        },
        disabilities: preResult.disabilities.split(',').map((disabilityId: string) => Number(disabilityId)),
      },
      classroom: {
        id: preResult.classroom_id,
        shortName: preResult.classroom_shortName,
        school: {
          id: preResult.school_id,
          shortName: preResult.school_shortName,
        }
      }
    }
  }
  async studentsClassrooms(options: ObjectLiteral) {

    // TODO: get yearId from request
    const yearId = 1

    const preResult = await AppDataSource
      .createQueryBuilder()
      .select([
        'studentClassroom.id',
        'studentClassroom.rosterNumber',
        'studentClassroom.startedAt',
        'studentClassroom.endedAt',
        'student.id',
        'student.ra',
        'student.dv',
        'state.id',
        'state.acronym',
        'person.id',
        'person.name',
        'person.birth',
        'classroom.id',
        'classroom.shortName',
        'school.id',
        'school.shortName',
      ])
      .from(StudentClassroom, 'studentClassroom')
      .leftJoin('studentClassroom.student', 'student')
      .leftJoin('student.person', 'person')
      .leftJoin('student.state', 'state')
      .leftJoin('studentClassroom.classroom', 'classroom')
      .leftJoin('classroom.school', 'school')
      .leftJoin('studentClassroom.year', 'year')
      .where('year.id = :yearId', { yearId })
      .groupBy('studentClassroom.id')
      .getRawMany();

    return preResult.map((item) => {
      return {
        id: item.studentClassroom_id,
        rosterNumber: item.studentClassroom_rosterNumber,
        startedAt: item.studentClassroom_startedAt,
        endedAt: item.studentClassroom_endedAt,
        student: {
          id: item.student_id,
          ra: item.student_ra,
          dv: item.student_dv,
          state: {
            id: item.state_id,
            acronym: item.state_acronym,
          },
          person: {
            id: item.person_id,
            name: item.person_name,
            birth: item.person_birth,
          },
        },
        classroom: {
          id: item.classroom_id,
          shortName: item.classroom_shortName,
          school: {
            id: item.school_id,
            shortName: item.school_shortName,
          },
        },
      }
    })
  }
  // TODO: move to utils
  newPerson(body: SaveStudent, category: PersonCategory) {
    const person = new Person()
    person.name = body.name;
    person.birth = body.birth;
    person.category = category
    return person
  }
  newStudent(body: SaveStudent, person: Person, state: State) {

    const student = new Student()
    student.person = person
    student.ra = body.ra
    student.dv = body.dv
    student.state = state
    student.observationOne = body.observationOne
    student.observationTwo = body.observationTwo
    return student
  }
}

export const studentController = new StudentController();
