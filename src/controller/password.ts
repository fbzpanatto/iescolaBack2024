import { Request } from "express";
import { Teacher } from "../model/Teacher";
import { AppDataSource } from "../data-source";
import { mainEmail } from "../utils/email.service";
import { EntityManager } from "typeorm";

class PasswordController {
  constructor() {}

  async resetPassword(req: Request) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const teacher = await this.teacherByUser(req.body.email, CONN);
        if (!teacher) { return { status: 404, message: "Não foi possível encontrar o usuário informado." } }
        await mainEmail(req.body.email, teacher.person.user.password, false).catch((e) => console.log(e));
        return { status: 200, data: { message: "Email enviado com sucesso. Confira sua caixa de entrada." } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async teacherByUser(email: string, CONN: EntityManager) {
    const options = { relations: ["person.category", "person.user"], where: { person: { user: { email } } } }
    return (await CONN.findOne(Teacher, { ...options })) as Teacher }
}

export const passwordController = new PasswordController();