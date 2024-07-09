import { Request } from "express";
import { Teacher } from "../model/Teacher";
import { AppDataSource } from "../data-source";
import { mainEmail } from "../utils/email.service";

class PasswordController {
  constructor() {}

  async resetPassword(request: Request) {
    const { body } = request;

    try {
      const teacher = await this.teacherByUser(body.email);

      if (!teacher) {
        return {
          status: 404,
          message: "Não foi possível encontrar o usuário informado.",
        };
      }

      await mainEmail(body.email, teacher.person.user.password, false).catch(
        (e) => console.log(e),
      );

      return {
        status: 200,
        data: {
          message: "Email enviado com sucesso. Confira sua caixa de entrada.",
        },
      };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  async teacherByUser(email: string) {
    return (await AppDataSource.getRepository(Teacher).findOne({
      relations: ["person.category", "person.user"],
      where: { person: { user: { email } } },
    })) as Teacher;
  }
}

export const passwordController = new PasswordController();
