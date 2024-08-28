import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget } from "typeorm";
import { School } from "../model/School";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { Year } from "../model/Year";

class SchoolController extends GenericController<EntityTarget<School>> {
  constructor() { super(School) }

  async getAllSchools(req: Request) {

    const { year } = req.params
    const { search } = req.query

    try {
      return await AppDataSource.transaction(async(CONN: EntityManager) => {

        const selectedYear = await CONN.findOne(Year, { where: { name: year } })
        if (!selectedYear) return { status: 404, message: "Ano não encontrado." };

        const data: School[] = await CONN.getRepository(School)
          .createQueryBuilder('school')
          .leftJoinAndSelect("school.classrooms", "classroom")
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.year", "year")
          .leftJoin("studentClassroom.student", "student")
          .where("year.id = :yearSearch", { yearSearch: selectedYear.id })
          .andWhere(new Brackets((qb) => {
            if (search) {
              qb.where("school.name LIKE :search", { search: `%${search}%` })
                .orWhere("school.shortName LIKE :search", { search: `%${search}%` })
            }}))
          .getMany()

        const preResult = data.map(school => {
          return {
            id: school.id,
            name: school.name,
            activeStudents: school.classrooms.flatMap(el => el.studentClassrooms.filter(st => st.endedAt === null )).length,
            inactiveStudents: school.classrooms.flatMap(el => el.studentClassrooms.filter(st => st.endedAt !== null)).length
          }
        })

        const cityHall = {
          id: '--',
          name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA',
          activeStudents: preResult.reduce((acc, prev) => acc + prev.activeStudents, 0),
          inactiveStudents: preResult.reduce((acc, prev) => acc + prev.inactiveStudents, 0),
        }

        const sortedResult = [ cityHall, ...preResult ].sort((a, b) => b.activeStudents - a.activeStudents);

        return { status: 200, data: sortedResult };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const schoolController = new SchoolController();
