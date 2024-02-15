import { Request } from "express";
import { Transporter } from "../utils/transporter";
import { Teacher } from "../model/Teacher";
import { AppDataSource } from "../data-source";

import SMTPTransport from "nodemailer/lib/smtp-transport";

class PasswordController {

  constructor() { }

  transporterCallBack(err: Error | null, data: SMTPTransport.SentMessageInfo) {
    if (err) {
      console.log("Error " + err);
    } else {
      console.log("Email sent successfully");
    }
  }

  async teacherByUser(username: string) {
    return await AppDataSource.getRepository(Teacher).findOne({
      relations: ['person.category', 'person.user'],
      where: { person: { user: { username: username } } },
    }) as Teacher
  }

  async resetPassword(request: Request) {

    const { body } = request

    try {

      const teacher = await this.teacherByUser(body.username)

      if(!teacher) { return { status: 404, message: 'Não foi possível encontrar o usuário informado.' } }

      Transporter.sendMail({
        from: "appescola7@gmail.com",
        to: teacher.email,
        subject: 'Redefinição de senha.',
        text: `Sua senha é: ${teacher.person.user.password}`
      }, this.transporterCallBack);

      return { status: 200, data: { message: "Email enviado com sucesso. Confira sua caixa de entrada."  } };

    } catch (error: any) { return { status: 500, message: error.message } }

  }
}

export const passwordController = new PasswordController();
