import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { School } from "../model/School";
import { Request } from "express";
import { AppDataSource } from "../data-source";

class ReportLiteracy extends GenericController<EntityTarget<School>> {

  constructor() {
    super(School);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const year = request?.params.year;

    try {

      const result = await AppDataSource.getRepository(School)
        .createQueryBuilder('school')
        .leftJoinAndSelect('school.classrooms', 'classroom')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassroom')
        .leftJoin('studentClassroom.year', 'year')
        .leftJoin('studentClassroom.literacies', 'literacy')
        .where( 'year.name = :year', { year } )
        .andWhere('literacy.id IS NOT NULL')
        .getMany()

      interface schoolResult {
        id: number
        school: string,
        first: {
          totalOfClassrooms: number,
          totalOfStudents: number,
        },
        second: {
          totalOfClassrooms: number,
          totalOfStudents: number,
        },
        third: {
          totalOfClassrooms: number,
          totalOfStudents: number,
        },
      }

      const resultSchools: schoolResult[] = result.map(school => {
        return {
          id: school.id,
          school: school.name,
          first: {
            totalOfClassrooms: school.classrooms.filter(classroom => classroom.shortName.includes('1')).length,
            totalOfStudents: school.classrooms.filter(classroom => classroom.shortName.includes('1')).map(classroom => classroom.studentClassrooms.length).reduce((a, b) => a + b, 0)
          },
          second: {
            totalOfClassrooms: school.classrooms.filter(classroom => classroom.shortName.includes('2')).length,
            totalOfStudents: school.classrooms.filter(classroom => classroom.shortName.includes('2')).map(classroom => classroom.studentClassrooms.length).reduce((a, b) => a + b, 0)
          },
          third: {
            totalOfClassrooms: school.classrooms.filter(classroom => classroom.shortName.includes('3')).length,
            totalOfStudents: school.classrooms.filter(classroom => classroom.shortName.includes('3')).map(classroom => classroom.studentClassrooms.length).reduce((a, b) => a + b, 0)
          },
        }
      })

      return { status: 200, data: resultSchools };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const reportLiteracyController = new ReportLiteracy();
