import { GenericController } from "./genericController";
import { School } from "../model/School";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { LiteracyLevel } from "../model/LiteracyLevel";
import { LiteracyTier } from "../model/LiteracyTier";
import { Year } from "../model/Year";

class ReportLiteracy extends GenericController<School> {

  constructor() {
    super(School);
  }

  async getReport(request: Request) {
    const { classroom, year } = request.params;
    const { search } = request.query;

    try {
      const [literacyLevels, literacyTiers, selectedYear] = await Promise.all([
        AppDataSource.getRepository(LiteracyLevel).find(),
        AppDataSource.getRepository(LiteracyTier).find(),
        AppDataSource.getRepository(Year).findOne({ where: { name: year } })
      ]);

      if(!selectedYear) return { status: 404, message: 'Year not found' }

      const data = await AppDataSource.getRepository(School)
        .createQueryBuilder('school')
        .leftJoinAndSelect('school.classrooms', 'classroom')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
        .leftJoinAndSelect('studentClassrooms.year', 'year')
        .leftJoinAndSelect('studentClassrooms.literacies', 'literacies')
        .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
        .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
        .where('year.id = :year', { year: selectedYear.id })
        .andWhere('school.active = 1')
        .andWhere('classroom.shortName LIKE :classroom', { classroom: `%${classroom}%` })
        .andWhere('school.name LIKE :search OR school.shortName LIKE :search', { search: `%${search}%` })
        .orderBy('school.name', 'ASC')
        .getMany();

      const arrOfSchools = data.map(school => ({
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        studentsClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms)
      }));

      return { status: 200, data: { literacyTiers, literacyLevels, schools: arrOfSchools } };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const reportLiteracyController = new ReportLiteracy();
