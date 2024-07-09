import { TextGenderExam } from "./../model/TextGenderExam";
import { GenericController } from "./genericController";
import { Brackets, EntityTarget } from "typeorm";
import { TextGenderGrade } from "../model/TextGenderGrade";
import { AppDataSource } from "../data-source";
import { Classroom } from "../model/Classroom";
import { Year } from "../model/Year";
import { TextGender } from "../model/TextGender";
import { StudentClassroom } from "../model/StudentClassroom";
import { TextGenderExamTier } from "../model/TextGenderExamTier";
import {
  BodyTextGenderExamGrade,
  UserInterface,
} from "../interfaces/interfaces";
import { pc } from "../utils/personCategories";
import { TextGenderExamLevel } from "../model/TextGenderExamLevel";
import { Request } from "express";
import { TextGenderClassroom } from "../model/TextGenderClassroom";
import { School } from "../model/School";

class TextGenderGradeController extends GenericController<
  EntityTarget<TextGenderGrade>
> {
  constructor() {
    super(TextGenderGrade);
  }

  async getAll(req: any) {
    const { classroom: classId, year: yearName, gender: genderId } = req.params;

    try {
      const classroom = (await AppDataSource.getRepository(Classroom).findOne({
        relations: ["school"],
        where: { id: Number(classId) },
      })) as Classroom;

      if (!classroom) return { status: 404, message: "Sala não encontrada" };

      const year = (await AppDataSource.getRepository(Year).findOne({
        where: { name: yearName },
      })) as Year;

      if (!year) return { status: 404, message: "Ano não encontrado" };

      const gender = (await AppDataSource.getRepository(TextGender).findOne({
        where: { id: Number(genderId) },
      })) as TextGender;

      if (!gender) return { status: 404, message: "Gênero não encontrado" };

      const examLevel = await AppDataSource.getRepository(TextGenderExam)
        .createQueryBuilder("textGenderExam")
        .leftJoinAndSelect(
          "textGenderExam.textGenderExamLevelGroups",
          "textGenderExamLevelGroup",
        )
        .leftJoinAndSelect(
          "textGenderExamLevelGroup.textGenderExamLevel",
          "textGenderExamLevel",
        )
        .getMany();

      const examTier = await AppDataSource.getRepository(TextGenderExamTier)
        .createQueryBuilder("textGenderExamTier")
        .getMany();

      const result = await AppDataSource.getRepository(StudentClassroom)
        .createQueryBuilder("studentClassroom")
        .leftJoin("studentClassroom.classroom", "classroom")
        .leftJoin("studentClassroom.year", "year")
        .leftJoinAndSelect("studentClassroom.student", "student")
        .leftJoinAndSelect("student.person", "person")
        .leftJoinAndSelect(
          "studentClassroom.textGenderGrades",
          "textGenderGrade",
        )
        .leftJoinAndSelect("textGenderGrade.textGender", "textGender")
        .leftJoinAndSelect("textGenderGrade.textGenderExam", "textGenderExam")
        .leftJoinAndSelect(
          "textGenderGrade.textGenderExamTier",
          "textGenderExamTier",
        )
        .leftJoinAndSelect(
          "textGenderGrade.textGenderExamLevel",
          "textGenderExamLevel",
        )
        .where("classroom.id = :classId", { classId })
        .andWhere("year.name = :yearName", { yearName })
        .andWhere("textGender.id = :genderId", { genderId })
        .getMany();

      const finalResult = {
        gender: gender,
        year: year,
        classroom: classroom,
        headers: { examLevel, examTier },
        data: result,
      };

      interface iLocalExam {
        id: number;
        name: string;
        tiers: {
          id: number;
          name: string;
          total: number;
          levels: {
            id: number;
            name: string;
            total: number;
            rate: number;
          }[];
        }[];
      }

      const resultArray: iLocalExam[] = [];

      for (let exam of examLevel) {
        let localExam: iLocalExam = { id: exam.id, name: exam.name, tiers: [] };

        resultArray.push(localExam);

        for (let tier of examTier) {
          let totalPerTier = 0;

          const auxLocalExamLevel = resultArray.find((el) => el.id === exam.id);
          auxLocalExamLevel?.tiers.push({
            id: tier.id,
            name: tier.name,
            levels: [],
            total: totalPerTier,
          });

          for (let level of exam.textGenderExamLevelGroups) {
            let totalPerLevel = 0;

            const auxLocalTier = auxLocalExamLevel?.tiers.find(
              (el) => el.id === tier.id,
            );
            auxLocalTier?.levels.push({
              id: level.textGenderExamLevel.id,
              name: level.textGenderExamLevel.name,
              total: totalPerLevel,
              rate: 0,
            });
            const auxLocalTierLevel = auxLocalTier?.levels.find(
              (el) => el.id === level.textGenderExamLevel.id,
            );

            for (let st of result) {
              for (let el of st.textGenderGrades) {
                if (
                  el.textGenderExamLevel?.id &&
                  exam.id === el.textGenderExam.id &&
                  tier.id === el.textGenderExamTier.id &&
                  level.textGenderExamLevel.id === el.textGenderExamLevel.id &&
                  el.toRate
                ) {
                  totalPerTier += 1;
                  totalPerLevel += 1;

                  auxLocalTier!.total = totalPerTier;
                  auxLocalTierLevel!.total = totalPerLevel;
                }
              }
            }
          }
        }
      }

      for (let exam of resultArray) {
        for (let tier of exam.tiers) {
          for (let level of tier.levels) {
            level.rate = Math.round((level.total / tier.total) * 100);
          }
        }
      }

      return { status: 200, data: { ...finalResult, resultArray } };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  async getTotals(request: Request) {
    const { user: userBody } = request.body;
    const { classroom: classId, year: yearName } = request.params;

    try {
      const teacher = await this.teacherByUser(userBody.user);
      const isAdminSupervisor =
        teacher.person.category.id === pc.ADMINISTRADOR ||
        teacher.person.category.id === pc.SUPERVISOR;
      const { classrooms } = await this.teacherClassrooms(request?.body.user);
      if (!classrooms.includes(Number(classId)) && !isAdminSupervisor)
        return {
          status: 403,
          message: "Você não tem permissão para acessar essa sala.",
        };

      const classroom = (await AppDataSource.getRepository(Classroom).findOne({
        relations: ["school"],
        where: { id: Number(classId) },
      })) as Classroom;

      if (!classroom) return { status: 404, message: "Sala não encontrada" };

      const notDigit = /\D/g;
      const classroomNumber = classroom.shortName.replace(notDigit, "");

      const year = (await AppDataSource.getRepository(Year).findOne({
        where: { name: yearName },
      })) as Year;

      if (!year) return { status: 404, message: "Ano não encontrado" };

      const examLevel = await AppDataSource.getRepository(TextGenderExam)
        .createQueryBuilder("textGenderExam")
        .leftJoinAndSelect(
          "textGenderExam.textGenderExamLevelGroups",
          "textGenderExamLevelGroup",
        )
        .leftJoinAndSelect(
          "textGenderExamLevelGroup.textGenderExamLevel",
          "textGenderExamLevel",
        )
        .getMany();

      const examTier = await AppDataSource.getRepository(TextGenderExamTier)
        .createQueryBuilder("textGenderExamTier")
        .getMany();

      const genders = await AppDataSource.getRepository(TextGenderClassroom)
        .createQueryBuilder("textGenderClassroom")
        .leftJoinAndSelect("textGenderClassroom.textGender", "textGender")
        .where("classroomNumber = :classroomNumber", { classroomNumber })
        .getMany();

      const allData: { id: number; name: string; classrooms: Classroom[] }[] =
        [];

      for (let gender of genders) {
        const classrooms = await AppDataSource.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassrooms")
          .leftJoinAndSelect("studentClassrooms.year", "year")
          .leftJoinAndSelect(
            "studentClassrooms.textGenderGrades",
            "textGenderGrades",
          )
          .leftJoinAndSelect("textGenderGrades.textGender", "textGender")
          .leftJoinAndSelect(
            "textGenderGrades.textGenderExam",
            "textGenderExam",
          )
          .leftJoinAndSelect(
            "textGenderGrades.textGenderExamTier",
            "textGenderExamTier",
          )
          .leftJoinAndSelect(
            "textGenderGrades.textGenderExamLevel",
            "textGenderExamLevel",
          )
          .where("classroom.shortName LIKE :shortName", {
            shortName: `%${classroomNumber}%`,
          })
          .andWhere("year.id = :yearId", { yearId: year.id })
          .andWhere("textGender.id = :textGenderId", {
            textGenderId: gender.textGender.id,
          })
          .getMany();

        allData.push({
          id: gender.textGender.id,
          name: gender.textGender.name,
          classrooms,
        });
      }

      const schoolAndCity = allData.map((el) => {
        return {
          ...el,
          classrooms: el.classrooms.filter(
            (cl) => cl.school.id === classroom.school.id,
          ),
        };
      });

      for (let gender of genders) {
        const cityHall = this.createCityHall();
        const groupIndex = schoolAndCity.findIndex(
          (el) => el.id === gender.textGender.id,
        );
        const preResult = allData.filter(
          (el) => el.id === gender.textGender.id,
        );
        cityHall.studentClassrooms = preResult.flatMap((el) =>
          el.classrooms.flatMap((st) => st.studentClassrooms),
        );
        schoolAndCity[groupIndex].classrooms.push(cityHall);
      }

      const result = {
        year,
        classroom,
        classroomNumber,
        genders,
        headers: { examLevel, examTier },
        groups: schoolAndCity,
      };

      interface iLocalGender {
        id: number;
        name: string;
        classrooms: {
          id: number;
          name: string;
          exams: {
            id: number;
            name: string;
            tiers: {
              id: number;
              name: string;
              total: number;
              levels: {
                id: number;
                name: string;
                total: number;
                rate: number;
              }[];
            }[];
          }[];
        }[];
      }

      const resultArray: iLocalGender[] = [];

      for (let txtGender of schoolAndCity) {
        let localTxtGender: iLocalGender = {
          id: txtGender.id,
          name: txtGender.name,
          classrooms: [],
        };

        resultArray.push(localTxtGender);

        for (let classroom of txtGender.classrooms) {
          const auxLocalTextGender = resultArray.find(
            (el) => el.id === txtGender.id,
          );
          auxLocalTextGender?.classrooms.push({
            id: classroom.id,
            name: classroom.shortName,
            exams: [],
          });

          for (let exam of examLevel) {
            const auxLocalClassroom = auxLocalTextGender?.classrooms.find(
              (el) => el.id === classroom.id,
            );
            auxLocalClassroom?.exams.push({
              id: exam.id,
              name: exam.name,
              tiers: [],
            });

            for (let tier of examTier) {
              let totalPerTier = 0;

              const auxLocalExam = auxLocalClassroom?.exams.find(
                (el) => el.id === exam.id,
              );
              auxLocalExam?.tiers.push({
                id: tier.id,
                name: tier.name,
                levels: [],
                total: totalPerTier,
              });

              for (let level of exam.textGenderExamLevelGroups) {
                let totalPerLevel = 0;

                const auxLocalTier = auxLocalExam?.tiers.find(
                  (el) => el.id === tier.id,
                );
                auxLocalTier?.levels.push({
                  id: level.textGenderExamLevel.id,
                  name: level.textGenderExamLevel.name,
                  rate: 0,
                  total: totalPerLevel,
                });

                const auxLocalTierLevel = auxLocalTier?.levels.find(
                  (el) => el.id === level.textGenderExamLevel.id,
                );

                for (let el of classroom.studentClassrooms.flatMap(
                  (el) => el.textGenderGrades,
                )) {
                  if (
                    el.textGenderExamLevel?.id &&
                    el.textGender.id === txtGender.id &&
                    exam.id === el.textGenderExam.id &&
                    tier.id === el.textGenderExamTier.id &&
                    level.textGenderExamLevel.id ===
                      el.textGenderExamLevel.id &&
                    el.toRate
                  ) {
                    totalPerTier += 1;
                    totalPerLevel += 1;

                    auxLocalTier!.total = totalPerTier;
                    auxLocalTierLevel!.total = totalPerLevel;
                  }
                }
              }
            }
          }
        }
      }

      for (let textGender of resultArray) {
        for (let classroom of textGender.classrooms) {
          for (let exams of classroom.exams) {
            for (let tier of exams.tiers) {
              for (let level of tier.levels) {
                level.rate = Math.round((level.total / tier.total) * 100);
              }
            }
          }
        }
      }

      return { status: 200, data: { ...result, resultArray } };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  async updateStudentTextGenderExamGrade(body: BodyTextGenderExamGrade) {
    const {
      studentClassroom,
      textGender,
      textGenderExam,
      textGenderExamTier,
      textGenderExamTierLevel,
      toRate,
      user,
    } = body;

    try {
      const teacherClasses = await this.teacherClassrooms(user);

      const stTextGenderGrade = await AppDataSource.getRepository(
        TextGenderGrade,
      )
        .createQueryBuilder("textGenderGrade")
        .leftJoin("textGenderGrade.studentClassroom", "studentClassroom")
        .leftJoin("studentClassroom.classroom", "classroom")
        .leftJoin("textGenderGrade.textGender", "textGender")
        .leftJoin("textGenderGrade.textGenderExam", "textGenderExam")
        .leftJoin("textGenderGrade.textGenderExamTier", "textGenderExamTier")
        .where(
          new Brackets((qb) => {
            if (
              user.category != pc.ADMINISTRADOR &&
              user.category != pc.SUPERVISOR
            ) {
              qb.where("classroom.id IN (:...teacherClasses)", {
                teacherClasses: teacherClasses.classrooms,
              });
            }
          }),
        )
        .andWhere("studentClassroom.id = :studentClassroomId", {
          studentClassroomId: studentClassroom.id,
        })
        .andWhere("textGender.id = :textGenderId", {
          textGenderId: textGender.id,
        })
        .andWhere("textGenderExam.id = :textGenderExamId", {
          textGenderExamId: textGenderExam.id,
        })
        .andWhere("textGenderExamTier.id = :textGenderExamTierId", {
          textGenderExamTierId: textGenderExamTier.id,
        })
        .getOne();

      if (!stTextGenderGrade) {
        return {
          status: 400,
          message: "Não foi possível processar sua requisição",
        };
      }

      let textGenderExamTierLevelDb: any;

      if (textGenderExamTierLevel && textGenderExamTierLevel.id) {
        textGenderExamTierLevelDb = await AppDataSource.getRepository(
          TextGenderExamLevel,
        ).findOne({ where: { id: textGenderExamTierLevel.id } });
      }

      if (!textGenderExamTierLevel) {
        textGenderExamTierLevelDb = null;
      }

      stTextGenderGrade.textGenderExamLevel = textGenderExamTierLevelDb;

      let result = {};

      if (!studentClassroom.endedAt && toRate) {
        result =
          await AppDataSource.getRepository(TextGenderGrade).save(
            stTextGenderGrade,
          );
      }

      return { status: 200, data: result };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  getYear(yearName: string) {
    return AppDataSource.getRepository(Year).findOne({
      where: { name: yearName },
    });
  }

  getTextGender(textGenderId: string) {
    return AppDataSource.getRepository(TextGender)
      .createQueryBuilder("textGender")
      .where("textGender.id = :textGenderId", { textGenderId })
      .getOne();
  }

  getExamLevel() {
    return AppDataSource.getRepository(TextGenderExam)
      .createQueryBuilder("textGenderExam")
      .leftJoinAndSelect(
        "textGenderExam.textGenderExamLevelGroups",
        "textGenderExamLevelGroup",
      )
      .leftJoinAndSelect(
        "textGenderExamLevelGroup.textGenderExamLevel",
        "textGenderExamLevel",
      )
      .getMany();
  }

  getexamTier() {
    return AppDataSource.getRepository(TextGenderExamTier)
      .createQueryBuilder("textGenderExamTier")
      .getMany();
  }

  createCityHall() {
    return {
      id: "ITA",
      name: "PREFEITURA DO MUNICIPIO DE ITATIBA",
      shortName: "ITA",
      school: {
        id: 99,
        name: "PREFEITURA DO MUNICIPIO DE ITATIBA",
        shortName: "ITATIBA",
        inep: null,
        active: true,
      },
      studentClassrooms: [],
    } as unknown as Classroom;
  }

  examTotalizer(examLevel: TextGenderExam[], examTier: TextGenderExamTier[]) {
    const examTotalizer: {
      examId: number;
      examLabel: string;
      examTierId: number;
      examTierLabel: string;
      examTierLevelId: number;
      examTierLevelLabel: string;
      total: number;
      rate: number;
      graphicLabel: string;
    }[] = [];

    for (let exam of examLevel) {
      for (let tier of examTier) {
        for (let examLevel of exam.textGenderExamLevelGroups.flatMap(
          (el) => el.textGenderExamLevel,
        )) {
          const index = examTotalizer.findIndex(
            (el) =>
              el.examId === exam.id &&
              el.examTierId === tier.id &&
              el.examTierLevelId === examLevel.id,
          );
          if (index === -1) {
            examTotalizer.push({
              examId: exam.id,
              examLabel: exam.name,
              examTierId: tier.id,
              examTierLabel: tier.name,
              examTierLevelId: examLevel.id,
              examTierLevelLabel: examLevel.name,
              total: 0,
              rate: 0,
              graphicLabel:
                tier.id === 1
                  ? `${exam.name.split(" ").join("").slice(0, 2)} - 1 - ${examLevel.name.split(" ").join("").slice(0, 2)}`
                  : `${exam.name.split(" ").join("").slice(0, 2)} - 2 - ${examLevel.name.split(" ").join("").slice(0, 2)}`,
            });
          }
        }
      }
    }
    return examTotalizer;
  }

  async getAllData(
    classroomNumber: string,
    textGender: TextGender | null,
    year: Year,
  ) {
    return await AppDataSource.getRepository(School)
      .createQueryBuilder("school")
      .leftJoinAndSelect("school.classrooms", "classroom")
      .leftJoinAndSelect("classroom.studentClassrooms", "studentClassrooms")
      .leftJoinAndSelect("studentClassrooms.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("studentClassrooms.year", "year")
      .leftJoinAndSelect(
        "studentClassrooms.textGenderGrades",
        "textGenderGrades",
      )
      .leftJoinAndSelect("textGenderGrades.textGender", "textGender")
      .leftJoinAndSelect("textGenderGrades.textGenderExam", "textGenderExam")
      .leftJoinAndSelect(
        "textGenderGrades.textGenderExamTier",
        "textGenderExamTier",
      )
      .leftJoinAndSelect(
        "textGenderGrades.textGenderExamLevel",
        "textGenderExamLevel",
      )
      .where("classroom.shortName LIKE :shortName", {
        shortName: `%${classroomNumber}%`,
      })
      .andWhere("year.id = :yearId", { yearId: year.id })
      .andWhere("textGenderExamLevel.id IS NOT NULL")
      .andWhere("textGender.id = :textGenderId", {
        textGenderId: textGender?.id,
      })
      .orderBy("school.name", "ASC")
      .getMany();
  }

  async filteredSchool(
    classroomNumber: string,
    textGender: TextGender | null,
    year: Year,
    search: any,
  ) {
    return await AppDataSource.getRepository(School)
      .createQueryBuilder("school")
      .leftJoinAndSelect("school.classrooms", "classroom")
      .leftJoinAndSelect("classroom.studentClassrooms", "studentClassrooms")
      .leftJoinAndSelect("studentClassrooms.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("studentClassrooms.year", "year")
      .leftJoinAndSelect(
        "studentClassrooms.textGenderGrades",
        "textGenderGrades",
      )
      .leftJoinAndSelect("textGenderGrades.textGender", "textGender")
      .leftJoinAndSelect("textGenderGrades.textGenderExam", "textGenderExam")
      .leftJoinAndSelect(
        "textGenderGrades.textGenderExamTier",
        "textGenderExamTier",
      )
      .leftJoinAndSelect(
        "textGenderGrades.textGenderExamLevel",
        "textGenderExamLevel",
      )
      .where("classroom.shortName LIKE :shortName", {
        shortName: `%${classroomNumber}%`,
      })
      .andWhere("year.id = :yearId", { yearId: year.id })
      .andWhere("textGenderExamLevel.id IS NOT NULL")
      .andWhere("textGender.id = :textGenderId", {
        textGenderId: textGender?.id,
      })
      .andWhere(
        new Brackets((qb) => {
          if (search) {
            qb.where("school.name LIKE :search", {
              search: `%${search}%`,
            }).orWhere("school.shortName LIKE :search", {
              search: `%${search}%`,
            });
          }
        }),
      )
      .orderBy("school.name", "ASC")
      .getMany();
  }

  async updateMany(body: {
    user: UserInterface;
    data: { id: number; observation: string }[];
  }) {
    try {
      for (let item of body.data) {
        await AppDataSource.getRepository(TextGenderGrade).save({ ...item });
      }

      let result = {};

      return { status: 200, data: result };
    } catch (error: any) {
      console.log("error", error);
      return { status: 500, message: error.message };
    }
  }
}

export const textGenderGradeController = new TextGenderGradeController();
