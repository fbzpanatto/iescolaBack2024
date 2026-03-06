import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { User } from "../model/User";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { generatePassword } from "../utils/generatePassword";
import { PERSON_CATEGORIES as pc } from "../utils/enums";
import { TRANSFER_STATUS as ts } from "../utils/enums";
import { qPendingTransfers } from "../interfaces/interfaces";
import { Helper } from "../utils/helpers";
import bcrypt from 'bcrypt';

const tokenSecret = process.env.SECRET;

interface Response { status: number, data: { token: string, expiresIn: number | undefined, role: any, person: string, pendingTransfers?: qPendingTransfers[] } }

class LoginController extends GenericController<EntityTarget<User>> {
  constructor() { super(User) }

  async login(req: Request) {

    const email = req.body.email?.toLowerCase();
    const { password: frontPass } = req.body;

    try {

      const row = await this.qLogin(email);

      if (!row) { return { status: 404, message: "Credenciais Inválidas" } }

      const condition = bcrypt.compareSync(frontPass, row.password);

      if (!condition) { return { status: 401, message: "Credenciais Inválidas" } }

      const user = Helper.userResponse(row);

      const payload = { user: user.id, email: user.email, category: user.person.category.id };

      const token = sign(payload, tokenSecret ?? '', { expiresIn: 10800 });
      const decoded = verify(token, tokenSecret ?? '') as JwtPayload;
      const expiresIn = decoded.exp;
      const role = decoded.category;

      if(this.categories.includes(user.person.category.id)) {

        const currentYear = await this.qCurrentYear();

        if(user.person.category.id === pc.ADMN) {
          const allPendingTransfers = await this.qAllPendingTransferBySchool(currentYear.id, ts.PENDING);
          return this.loginResponse(token, expiresIn, role, user, allPendingTransfers);
        }

        if(user.person.teacher?.school?.id) {
          const pendingTransfers = await this.qPendingTransferBySchool(currentYear.id, ts.PENDING, user.person.teacher.school.id);
          return this.loginResponse(token, expiresIn, role, user, pendingTransfers);
        }
      }
      return this.loginResponse(token, expiresIn, role, user);
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async studentLogin(req: Request) {
    const { ra: fullRa, birthDate } = req.body;

    try {

      const ra = fullRa.slice(0, -1);
      const dv = fullRa.slice(-1);

      const student = await this.qStudentByRa(ra, dv, birthDate)

      if (!student) { return { status: 404, message: "Credenciais Inválidas" } }

      const payload = { user: student.id, ra: `${student.ra}${student.dv}`, category: student.categoryId };

      const token = sign(payload, tokenSecret ?? '', { expiresIn: 10800 })
      const decoded = verify(token, tokenSecret ?? '') as JwtPayload;
      const expiresIn = decoded.exp;
      const role = decoded.category;

      return { status: 200, data: { token, expiresIn, role, person: student.name, studentId: student.id } }

    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async renewPassword(req: Request) {

    const { token: frontToken, password: newPassword } = req.body

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const frontDecoded = verify(frontToken, tokenSecret ?? '') as JwtPayload;

        if(!frontDecoded) { return { status: 401, message: 'Link expirado. Acesse o login e solicite a redefinição de senha novamente.' } }

        const user: User | null = await CONN.findOne(User,{
          relations: ["person.category"], where: { email: frontDecoded.email }
        });

        if (!user) { return { status: 404, message: "Usuário não encontrado" } }

        user.password = generatePassword(newPassword).hashedPassword
        await CONN.save(User, user)

        const payload = { user: user.id, email: user.email, category: user.person.category.id };
        const backendToken = sign(payload, tokenSecret ?? '', { expiresIn: 10800 })
        const decoded = verify(backendToken, tokenSecret ?? '') as JwtPayload;
        const expiresIn = decoded.exp;
        const role = decoded.category;

        return { status: 200, data: { token: backendToken, expiresIn, role, person: user.person.name } };
      })
    }
    catch (error: any) { return { status: 401, message: 'Token expirado. Solicite a redefinição de senha novamente.' } }
  }

  loginResponse(token: string, expiresIn: number | undefined, role: any, user: User, pendingTransfers?: any[]): Response {
    if(pendingTransfers && pendingTransfers.length > 0) { return { status: 200, data: { token, expiresIn, role, person: user.person.name, pendingTransfers } } }
    return { status: 200, data: { token, expiresIn, role, person: user.person.name } }
  }

  get categories() { return [pc.ADMN, pc.DIRE, pc.VICE, pc.COOR, pc.SECR] }
}

export const loginCtrl = new LoginController();
