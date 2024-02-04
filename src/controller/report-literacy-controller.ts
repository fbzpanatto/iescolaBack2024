import { GenericController } from "./genericController";
import { School } from "../model/School";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { LiteracyLevel } from "../model/LiteracyLevel";
import { LiteracyTier } from "../model/LiteracyTier";
import { Year } from "../model/Year";
import { Brackets } from "typeorm";

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

      if (!selectedYear) return { status: 404, message: 'Ano não encontrado.' }

      const allSchools = await AppDataSource.getRepository(School)
        .createQueryBuilder('school')
        .leftJoinAndSelect('school.classrooms', 'classroom')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
        .leftJoinAndSelect('studentClassrooms.year', 'year')
        .leftJoinAndSelect('studentClassrooms.literacies', 'literacies')
        .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
        .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
        .where('year.id = :yearSearch', { yearSearch: selectedYear.id })
        .andWhere('classroom.shortName LIKE :classroom', { classroom: `%${classroom}%` })
        .orderBy('school.name', 'ASC')
        .getMany();

      const filteredData = await AppDataSource.getRepository(School)
        .createQueryBuilder('school')
        .leftJoinAndSelect('school.classrooms', 'classroom')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
        .leftJoinAndSelect('studentClassrooms.year', 'year')
        .leftJoinAndSelect('studentClassrooms.literacies', 'literacies')
        .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
        .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
        .where('year.id = :yearSearch', { yearSearch: selectedYear.id })
        .andWhere('classroom.shortName LIKE :classroom', { classroom: `%${classroom}%` })
        .andWhere(new Brackets(qb => {
          if (search) {
            qb.where("school.name LIKE :search", { search: `%${search}%` })
              .orWhere("school.shortName LIKE :search", { search: `%${search}%` })
          }
        }))
        .orderBy('school.name', 'ASC')
        .getMany();

      const cityHall = {
        id: 'ITA',
        name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
        shortName: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
        studentsClassrooms: allSchools.flatMap(school => school.classrooms.flatMap(classroom => classroom.studentClassrooms))
      }

      const filteredSchoolArray = filteredData.map(school => ({
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        studentsClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms)
      }));

      interface iLocalSchool {
        id: number | string,
        name: string,
        tiers: {
          id: number,
          name: string,
          total: number,
          levels: {
            id: number,
            name: string,
            total: number,
            rate: number
          }[]
        }[]
      }

      const finalArray = [...filteredSchoolArray, cityHall]
      const resultArray = []

      for (let school of finalArray) {

        let localSchool: iLocalSchool = {
          id: school.id,
          name: school.name,
          tiers: [],
        }

        for (let tier of literacyTiers) {

          let totalPerTier = 0
          localSchool.tiers.push({ id: tier.id, name: tier.name, total: totalPerTier, levels: [] })

          for (let level of literacyLevels) {

            let totalPerLevel = 0

            const localTier = localSchool.tiers.find(tr => tr.id === tier.id)
            localTier?.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 })
            
            const localLevel = localTier?.levels.find(lv => lv.id === level.id)

            for (let st of school.studentsClassrooms) {

              for (let el of st.literacies) {

                if (el.literacyLevel?.id && tier.id === el.literacyTier.id && level.id === el.literacyLevel.id && el.toRate) {

                  totalPerLevel += 1
                  totalPerTier += 1

                  localLevel!.total = totalPerLevel
                  localTier!.total = totalPerTier
                }
              }
            }
          }
        }
        resultArray.push(localSchool)
      }

      return { status: 200, data: { literacyTiers, literacyLevels, schools: [...filteredSchoolArray, cityHall], classroomNumber: classroom, year: selectedYear.name, resultArray } };

    } catch (error: any) {
      return { status: 500, message: error.message }
    }
  }
}

export const reportLiteracyController = new ReportLiteracy();
