import { Request } from "express";
import { AppDataSource } from "../data-source";
import { resetPasswordEmailService } from "../services/email";
import { sign } from "jsonwebtoken";
import { User } from "../model/User";
import { EntityManager } from "typeorm";

class PasswordController {
  constructor() {}

  async resetPassword(req: Request) {
    try {
      return await AppDataSource.transaction(async(CONN: EntityManager) => {

        const uTeacher: User | null = await CONN.findOne(User,{ relations: ["person.category"], where: { email: req.body.email } });

        if (!uTeacher) { return { status: 404, message: "Não foi possível encontrar o usuário informado." } }

        const token = this.createResetToken({ id: uTeacher.id, email: uTeacher.email, category: uTeacher.person.category.id })

        uTeacher.password = token

        await resetPasswordEmailService(uTeacher.email, token)
        await CONN.save(User, uTeacher)

        return { status: 200, data: { message: "Um link para redefinir sua senha foi enviado para o email informado. Confira sua caixa de entrada." } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  createResetToken(payload: { id: number, email: string, category: number }): string {
    return sign(payload, "SECRET", { expiresIn: 86400 })
  }
}

export const passwordController = new PasswordController();