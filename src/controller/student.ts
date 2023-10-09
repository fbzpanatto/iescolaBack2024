import { GenericController } from "./genericController";
import {EntityTarget, FindManyOptions, In, IsNull, ObjectLiteral} from "typeorm";
import { Student } from "../model/Student";
import { AppDataSource } from "../data-source";
import { PersonCategory } from "../model/PersonCategory";
import { personCategories } from "../utils/personCategories";
import { StudentDisability } from "../model/StudentDisability";
import { Disability } from "../model/Disability";
import { State } from "../model/State";
import { StudentClassroom } from "../model/StudentClassroom";
import { SaveStudent, StudentClassroomReturn } from "../interfaces/interfaces";
import { Person } from "../model/Person";
import { Request } from "express";
import { Teacher } from "../model/Teacher";

class StudentController extends GenericController<EntityTarget<Student>> {
  constructor() { super(Student) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const body = request?.body.user
    const search = request?.query.search as string
    const year = request?.query.year as string

    const result = await AppDataSource
      .createQueryBuilder()
      .select('teacher.id', 'teacher' )
      .addSelect('GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)', 'classrooms')
      .from(Teacher, 'teacher')
      .leftJoin('teacher.person', 'person')
      .leftJoin('person.user', 'user')
      .leftJoin('teacher.teacherClassDiscipline', 'teacherClassDiscipline')
      .leftJoin('teacherClassDiscipline.classroom', 'classroom')
      .where('user.id = :userId AND teacherClassDiscipline.endedAt IS NULL', { userId: body.user })
      .groupBy('teacher.id')
      .getRawOne();

    console.log(result)


    try {
      // TODO: filter by endedAt se eu permitir no front mandar um ativos e inativos
      const studentsClassrooms = await this.studentsClassrooms({ search, year }) as StudentClassroomReturn[]
      return { status: 200, data: studentsClassrooms };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  override async findOneById(id: string | number) {
    try {
      const result = await this.student(Number(id));
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
      const disabilities = await this.disabilities(body.disabilities);
      const person = this.createPerson({ name: body.name, birth: body.birth, category });
      const student = await this.repository.save(this.createStudent(body, person, state));
      if(!!disabilities.length) {
        await AppDataSource.getRepository(StudentDisability).save(disabilities.map(disability => {
          return { student, startedAt: new Date(), disability }
        }))
      }
      await AppDataSource.getRepository(StudentClassroom).save({ student,  classroom,  year,  rosterNumber: Number(body.rosterNumber),  startedAt: new Date() })
      return { status: 201, data: student };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  override async updateId(studentId: string, body: SaveStudent) {
    try {

      const student = await this.repository
        .findOne({
          where: { id: studentId }, relations: ['person', 'studentDisabilities.disability', 'state']
        }) as Student;

      student.ra = body.ra;
      student.dv = body.dv;
      student.state = await this.state(body.state);
      student.observationOne = body.observationOne;
      student.observationTwo = body.observationTwo;
      student.person.name = body.name;
      student.person.birth = body.birth;
      const response = await this.repository.save(student) as Student;

      const stDisabilities = student.studentDisabilities
        .filter((studentDisability) => !studentDisability.endedAt);

      await this.setDisabilities(response, stDisabilities, body.disabilities);

      const result = await this.student(Number(studentId));

      return { status: 200, data: result };
    } catch (error: any) {return { status: 500, message: error.message }}
  }
  async setDisabilities(student: Student, studentDisabilities: StudentDisability[], body: number[]) {
    const currentDisabilities = studentDisabilities.map((studentDisability) => studentDisability.disability.id)

    const create = body.filter((disabilityId) => !currentDisabilities.includes(disabilityId))

    if(create.length) {
      await AppDataSource.getRepository(StudentDisability).save(create.map(disabilityId => {
        return { student, disability: { id: disabilityId }, startedAt: new Date() }
      }))
    }

    const remove = currentDisabilities.filter((disabilityId) => !body.includes(disabilityId))

    if(remove.length) {
      for(let item of remove) {
        const studentDisability = studentDisabilities.find((studentDisability) => studentDisability.disability.id === item)
        if(studentDisability) {
          studentDisability.endedAt = new Date()
          await AppDataSource.getRepository(StudentDisability).save(studentDisability)
        }
      }
    }
  }
  async studentCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({where: {id: personCategories.ALUNO}}) as PersonCategory
  }
  async disabilities(ids: number[]) {
    return await AppDataSource.getRepository(Disability).findBy({id: In(ids)})
  }
  async student(studentId: number) {

    const student = await AppDataSource
      .createQueryBuilder()
      .select([
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
        'studentClassroom.id',
        'studentClassroom.rosterNumber',
        'studentClassroom.startedAt',
        'studentClassroom.endedAt',
        'classroom.id',
        'classroom.shortName',
        'school.id',
        'school.shortName',
        'GROUP_CONCAT(DISTINCT disability.id ORDER BY disability.id ASC) AS disabilities',
      ])
      .from(Student, 'student')
      .leftJoin('student.person', 'person')
      .leftJoin('student.studentDisabilities', 'studentDisabilities', 'studentDisabilities.endedAt IS NULL')
      .leftJoin('studentDisabilities.disability', 'disability')
      .leftJoin('student.state', 'state')
      .leftJoin('student.studentClassrooms', 'studentClassroom', 'studentClassroom.endedAt IS NULL')
      .leftJoin('studentClassroom.classroom', 'classroom')
      .leftJoin('classroom.school', 'school')
      .where('student.id = :studentId', { studentId })
      .groupBy('studentClassroom.id')
      .getRawOne();

    return {
      id: student.studentClassroom_id,
      rosterNumber: student.studentClassroom_rosterNumber,
      startedAt: student.studentClassroom_startedAt,
      endedAt: student.studentClassroom_endedAt,
      student: {
        id: student.student_id,
        ra: student.student_ra,
        dv: student.student_dv,
        observationOne: student.student_observationOne,
        observationTwo: student.student_observationTwo,
        state: {
          id: student.state_id,
          acronym: student.state_acronym
        },
        person: {
          id: student.person_id,
          name: student.person_name,
          birth: student.person_birth,
        },
        disabilities: student.disabilities?.split(',').map((disabilityId: string) => Number(disabilityId)) ?? [],
      },
      classroom: {
        id: student.classroom_id,
        shortName: student.classroom_shortName,
        school: {
          id: student.school_id,
          shortName: student.school_shortName,
        }
      }
    }
  }
  async studentsClassrooms(options: { search?: string, year?: string }) {

    const yearId = options.year ?? (await this.currentYear()).id

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
      .andWhere('person.name LIKE :search', { search: `%${options.search}%` })
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
  createStudent(body: SaveStudent, person: Person, state: State) {
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
