import { GenericController } from "./genericController";
import {Brackets, EntityManager, EntityTarget} from "typeorm";
import { Literacy } from "../model/Literacy";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { pc } from "../utils/personCategories";
import { Classroom } from "../model/Classroom";
import { classroomCategory } from "../utils/classroomCategory";
import { StudentClassroom } from "../model/StudentClassroom";
import { LiteracyLevel } from "../model/LiteracyLevel";
import { LiteracyTier } from "../model/LiteracyTier";
import { Year } from "../model/Year";
import { UserInterface } from "../interfaces/interfaces";
import { LiteracyFirst } from "../model/LiteracyFirst";

interface iLocalTier { id: number; name: string; total: number; levels: { id: number; name: string; total: number; rate: number }[] }
interface UpdateLiteracy { studentClassroom: StudentClassroom, literacyTier: { id: number }, literacyLevel: { id: number } | null, toRate: boolean, user: UserInterface }
interface iLocalClassroom { id: number | string; name: string; tiers: { id: number; name: string; total: number; levels: { id: number; name: string; total: number; rate: number }[] }[] }

class LiteracyController extends GenericController<EntityTarget<Literacy>> {
  constructor() { super(Literacy) }

  async getClassrooms(req: Request) {

    const search = req.query.search as string;
    const yearName = req.params.year as string;
    const userBody = req.body.user;

    const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
    const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const teacherClasses = await this.teacherClassrooms(req.body.user, CONN);

        const data = await CONN.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoinAndSelect("classroom.category", "category")
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.year", "year")
          .leftJoin("studentClassroom.literacies", "literacies")
          .where( new Brackets((qb) => { if ( userBody.category != pc.ADMN && userBody.category != pc.SUPE ) { qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })}}))
          .andWhere("category.id = :categoryId", { categoryId: classroomCategory.PEB_I })
          .andWhere("literacies.id IS NOT NULL")
          .andWhere("classroom.active = :active", { active: true })
          .andWhere("year.name = :yearName", { yearName })
          .andWhere( new Brackets((qb) => { if (search) { qb.where("school.name LIKE :search", { search: `%${search}%` }).orWhere("school.shortName LIKE :search", { search: `%${search}%` })}}))
          .orderBy("school.name", "ASC")
          .take(limit)
          .skip(offset)
          .getMany();

        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getStudentClassrooms(request: Request) {

    const yearName = request?.params.year as string;
    const userBody = request?.body.user;
    const classroomId = request?.params.id as string;

    try {
      return AppDataSource.transaction(async (CONN) => {

        const teacherClasses = await this.teacherClassrooms(request?.body.user, CONN)
        const literacyLevels = await CONN.find(LiteracyLevel)
        const literacyTiers = await CONN.find(LiteracyTier)
        const classroom = await CONN.findOne(Classroom, { where: { id: Number(classroomId) } })

        if (!classroom) return { status: 400, message: "Sala não encontrada" }

        const studentClassrooms = await this.studentClassesLiteracy(classroom as Classroom, userBody, teacherClasses, yearName, CONN);

        const resultArray: iLocalTier[] = [];

        for (let tier of literacyTiers) {
          let totalPerTier = 0;

          let localTier: iLocalTier = { id: tier.id, name: tier.name, total: totalPerTier, levels: [] };

          resultArray.push(localTier);

          for (let level of literacyLevels) {
            let totalPerLevel = 0;
            const auxLocalTier = resultArray.find((el) => el.id === tier.id);
            auxLocalTier?.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 });

            const auxLocalLevel = auxLocalTier?.levels.find((el) => el.id === level.id );

            for (let st of studentClassrooms) {
              for (let el of st.literacies) {
                if (el.literacyLevel?.id && tier.id === el.literacyTier.id && level.id === el.literacyLevel.id && el.toRate) {
                  totalPerLevel += 1;
                  totalPerTier += 1;

                  auxLocalLevel!.total = totalPerLevel;
                  auxLocalTier!.total = totalPerTier;
                }
              }
            }
          }
        }

        for (let tier of resultArray) { for (let level of tier.levels) { level.rate = Math.round((level.total / tier.total) * 100) } }

        return { status: 200, data: { literacyTiers, literacyLevels, studentClassrooms, resultArray } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async studentClassesLiteracy(classroom: Classroom, userBody: UserInterface, teacherClasses: { id: number; classrooms: number[] }, yearName: string, CONN: EntityManager) {

    const classroomNumber = classroom.shortName.replace(/\D/g, "");
    const lastYear = await CONN.findOne(Year, { where: { name: String(Number(yearName) - 1) } });
    let studentClassrooms: StudentClassroom[]

    studentClassrooms = await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.year", "year")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("studentClassroom.literacies", "literacies")
      .leftJoinAndSelect("literacies.literacyLevel", "literacyLevel")
      .leftJoinAndSelect("literacies.literacyTier", "literacyTier")
      .leftJoinAndSelect("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("classroom.school", "school")
      .where( new Brackets((qb) => { if ( userBody.category != pc.ADMN && userBody.category != pc.SUPE ) {
        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
      }}))
      .andWhere("classroom.id = :classroomId", { classroomId: classroom.id })
      .andWhere("literacies.id IS NOT NULL")
      .andWhere("year.name = :yearName", { yearName })
      .orderBy("studentClassroom.rosterNumber", "ASC")
      .getMany();

    if (!lastYear || Number(classroomNumber) === 1) {
      const result = studentClassrooms.map(async (studentClassroom) => {
        const literacyFirsts = await CONN.findOne(LiteracyFirst, { where: { student: { id: studentClassroom.student.id } }, relations: ["literacyLevel"] })
        return { ...studentClassroom, literacyFirsts: { id: literacyFirsts?.id, literacyLevel: literacyFirsts?.literacyLevel ?? { id: "NA", name: "NA", shortName: "NA" } } }
      })
      return await Promise.all(result);
    }

    const result = studentClassrooms.map(async (studentClassroom) => {
      const studentId = studentClassroom.student.id;

      const lastLiteracy = await CONN.getRepository(Literacy)
        .createQueryBuilder("literacy")
        .innerJoin("literacy.studentClassroom", "studentClassroom")
        .innerJoin("studentClassroom.year", "year")
        .innerJoin("studentClassroom.student", "student")
        .innerJoin("literacy.literacyTier", "literacyTier")
        .leftJoinAndSelect("literacy.literacyLevel", "literacyLevel")
        .where("student.id = :studentId", { studentId })
        .andWhere("literacyLevel.id IS NOT NULL") // Garante que o literacyLevel não seja nulo
        .andWhere("year.name = :yearName", { yearName: lastYear?.name })
        .orderBy("literacyTier.id", "DESC") // Ordena por ordem decrescente de ID do literacyTier
        .addOrderBy("literacy.id", "DESC") // Em caso de empate no ID do literacyTier, usa o ID do literacy
        .getOne();

      if (!lastLiteracy?.literacyLevel) {
        const literacyFirsts = await CONN.findOne(LiteracyFirst,{ where: { student: { id: studentClassroom.student.id } }, relations: ["literacyLevel"] })
        return { ...studentClassroom, literacyFirsts: { id: literacyFirsts?.id, literacyLevel: literacyFirsts?.literacyLevel ?? { id: "NA", name: "NA", shortName: "NA" } } }
      }
      return { ...studentClassroom, literacyFirsts: { id: lastLiteracy?.id, literacyLevel: lastLiteracy?.literacyLevel ?? { id: "NA", name: "NA", shortName: "NA" } } }
    })
    return await Promise.all(result);
  }

  async getTotals(request: Request) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const uTeacher = await this.teacherByUser(request?.body.user.user, CONN)

        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE || uTeacher.person.category.id === pc.FORM;

        const year = await CONN.findOne(Year,{ where: { name: request?.params.year } })

        if (!year) return { status: 404, message: "Ano não encontrado" }

        const { classrooms } = await this.teacherClassrooms(request?.body.user, CONN);
        if (!classrooms.includes(Number(request?.params.id)) && !masterUser) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

        const classroom = await CONN.findOne(Classroom, { where: { id: Number(request?.params.id) }, relations: ["school"] })
        if (!classroom) return { status: 404, message: "Sala não encontrada" }

        const literacyLevels = await CONN.find(LiteracyLevel)
        const literacyTiers = await CONN.find(LiteracyTier)

        const classroomNumber = classroom.shortName.replace(/\D/g, "");

        const allClassrooms = await CONN.getRepository(Classroom)
            .createQueryBuilder("classroom")
            .leftJoinAndSelect("classroom.school", "school")
            .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
            .leftJoinAndSelect("studentClassroom.literacies", "literacies")
            .leftJoinAndSelect("literacies.literacyLevel", "literacyLevel")
            .leftJoinAndSelect("literacies.literacyTier", "literacyTier")
            .leftJoinAndSelect("studentClassroom.year", "year")
            .where("classroom.shortName LIKE :shortName", { shortName: `%${classroomNumber}%` })
            .andWhere("year.id = :yearId", { yearId: year.id })
            .having("COUNT(studentClassroom.id) > 0")
            .groupBy("classroom.id, school.id, year.id, studentClassroom.id, literacies.id, literacyLevel.id, literacyTier.id" )
            .getMany();

        const schoolClassrooms = allClassrooms.filter((cl) => cl.school.id === classroom.school.id );

        const cityHall = {
          id: "ITA",
          name: "PREFEITURA DO MUNICIPIO DE ITATIBA",
          shortName: "ITA",
          school: { id: 99, name: "PREFEITURA DO MUNICIPIO DE ITATIBA", shortName: "ITATIBA", inep: null, active: true },
          studentClassrooms: allClassrooms.flatMap((cl) => cl.studentClassrooms),
        } as unknown as Classroom;

        const header = { city: "PREFEITURA DO MUNICIPIO DE ITATIBA", literacy: "Avaliação Diagnóstica", year: year.name, school: classroom.school.name, classroomNumber };

        let result = { header, literacyLevels, literacyTiers };

        const arrayOfClassrooms = [...schoolClassrooms, cityHall];
        const resultArray = [];

        for (let classroom of arrayOfClassrooms) {
          let localClassroom: iLocalClassroom = { id: classroom.id, name: classroom.name, tiers: [] };

          for (let tier of literacyTiers) {
            let totalPerTier = 0;
            localClassroom.tiers.push({ id: tier.id, name: tier.name, total: totalPerTier, levels: [] });

            for (let level of literacyLevels) {
              let totalPerLevel = 0;

              const localTier = localClassroom.tiers.find((tr) => tr.id === tier.id );
              localTier?.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 });

              const localLevel = localTier?.levels.find((lv) => lv.id === level.id );

              for (let st of classroom.studentClassrooms) {
                for (let el of st.literacies) {
                  if ( el.literacyLevel?.id && tier.id === el.literacyTier.id && level.id === el.literacyLevel.id && el.toRate ) {
                    totalPerLevel += 1;
                    totalPerTier += 1;
                    localLevel!.total = totalPerLevel;
                    localTier!.total = totalPerTier;
                  }
                }
              }
            }
          }
          resultArray.push(localClassroom);
        }

        for (let result of resultArray) {
          for (let tier of result.tiers) {
            for (let level of tier.levels) {
              level.rate = Math.round((level.total / tier.total) * 100);
            }
          }
        }
        return { status: 200, data: { ...result, resultArray } };
      })
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  async updateMany(body: { user: UserInterface; data: { id: number; observation: string }[] }) {
    try {
      return await AppDataSource.transaction(async (CONN) => {
        const uTeacher = await this.teacherByUser(body.user.user, CONN)
        for (let item of body.data) { await CONN.save(Literacy, { ...item, updatedAt: new Date(), updatedByUser: uTeacher.person.user.id } as Literacy ) }
        return { status: 200, data: {} }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateLiteracy(body: UpdateLiteracy) {

    const { studentClassroom, literacyTier, literacyLevel, user, toRate } = body

    try {

      let result = {};

      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN);
        const teacherClasses = await this.teacherClassrooms(user, CONN);

        const stLiteracy = await CONN.getRepository(Literacy)
          .createQueryBuilder("literacy")
          .leftJoin("literacy.studentClassroom", "studentClassroom")
          .leftJoin("studentClassroom.classroom", "classroom")
          .leftJoin("literacy.literacyTier", "literacyTier")
          .where(new Brackets((qb) => { if ( user.category != pc.ADMN && user.category != pc.SUPE ) { qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })}}))
          .andWhere("studentClassroom.id = :studentClassroomId", { studentClassroomId: studentClassroom.id })
          .andWhere("literacy.literacyTier = :literacyTierId", { literacyTierId: literacyTier.id })
          .getOne();

        if (!stLiteracy) { return { status: 400, message: "Não foi possível processar sua requisição" } }

        let literacyLevelDb: any;

        if (literacyLevel && literacyLevel.id) { literacyLevelDb = await CONN.findOne(LiteracyLevel, { where: { id: literacyLevel.id } })}

        if (!literacyLevel) { literacyLevelDb = null }

        if (!studentClassroom.endedAt && toRate) { result = await CONN.save(Literacy, {...stLiteracy, literacyLevel: literacyLevelDb, updatedAt: new Date(), updatedByUser: uTeacher.person.user.id }) }

        return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const literacyController = new LiteracyController();
