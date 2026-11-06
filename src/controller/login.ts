import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { User } from "../model/User";
import { Request } from "express";
import { verify, JwtPayload } from 'jsonwebtoken';
import { generatePassword } from "../utils/generatePassword";
import { PER_CAT as pc } from "../utils/enums";
import { TRANSFER_STATUS as ts } from "../utils/enums";
import { qPendingTransfers } from "../interfaces/interfaces";
import { sanitizeBirthDate, sanitizeStudentRa } from "../utils/studentLoginSanitizer";
import bcrypt from 'bcrypt';
import { yearRepository } from "../repositories/year.repository";
import { authRepository } from "../repositories/auth.repository";
import { transferRepository } from "../repositories/transfer.repository";
import { UserFormatter } from "../utils/formatters/user.formatter";
import { issueSession, SessionPayload, signAccessToken, verifyRefreshToken, ACCESS_TOKEN_TTL } from "../utils/sessionToken";

const tokenSecret = process.env.SECRET;

interface Response { status: number, data: { token: string, expiresIn: number | undefined, role: any, person: string, pendingTransfers?: qPendingTransfers[], refreshToken: string } }

class LoginController extends GenericController<EntityTarget<User>> {
  constructor() { super(User) }

  async login(req: Request) {

    const email = req.body.email?.toLowerCase();
    const { password: frontPass } = req.body;

    try {

      const row = await authRepository.qLogin(email);

      if (!row) { return { status: 401, message: "Credenciais Inválidas" } }

      const condition = await bcrypt.compare(frontPass, row.password);

      if (!condition) { return { status: 401, message: "Credenciais Inválidas" } }

      const user = UserFormatter.userResponse(row);

      const payload = { user: user.id, email: user.email, category: user.person.category.id };

      const session = issueSession(payload);
      const role = payload.category;

      if(this.categories.includes(user.person.category.id)) {

        const currentYear = await yearRepository.qCurrentYear();

        // Sem ano letivo ativo (ex: ano acabou de ser encerrado e nenhum outro
        // criado ainda) não há em que ano buscar transferências pendentes -
        // login segue normalmente, só sem essa informação extra.
        if (currentYear) {
          if(user.person.category.id === pc.ADMN) {
            const allPendingTransfers = await transferRepository.qAllPendingTransferBySchool(currentYear.id, ts.PENDING);
            return this.loginResponse(session, role, user, allPendingTransfers);
          }

          if(user.person.teacher?.school?.id) {
            const pendingTransfers = await transferRepository.qPendingTransferBySchool(currentYear.id, ts.PENDING, user.person.teacher.school.id);
            return this.loginResponse(session, role, user, pendingTransfers);
          }
        }
      }
      return this.loginResponse(session, role, user);
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async studentLogin(req: Request) {
    const { ra: rawRa, birthDate: rawBirthDate } = req.body;

    try {

      if (typeof rawRa !== 'string' || typeof rawBirthDate !== 'string') { return { status: 404, message: "Credenciais Inválidas" } }

      // Aceita RA com pontos/traço/espaços e datas fora do padrão: normaliza antes de comparar.
      const fullRa = sanitizeStudentRa(rawRa);
      const birthDate = sanitizeBirthDate(rawBirthDate);

      if (fullRa.length < 2) { return { status: 404, message: "Credenciais Inválidas" } }

      const ra = fullRa.slice(0, -1);
      const dv = fullRa.slice(-1);

      const student = await authRepository.qStudentByRa(ra, dv, birthDate)

      if (!student) { return { status: 404, message: "Credenciais Inválidas" } }

      const payload = { student: student.id, ra: `${student.ra}${student.dv}`, category: student.categoryId };

      const { token, expiresIn, refreshToken } = issueSession(payload)
      const role = payload.category;

      return { status: 200, data: { token, expiresIn, role, person: student.name, studentId: student.id, refreshToken } }

    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updatePassword(req: Request) {

    const { token: frontToken, password: newPassword } = req.body

    try {

      // 1. Validação Criptográfica (Tempo e Assinatura)
      const frontDecoded = verify(frontToken, tokenSecret ?? '') as JwtPayload;

      if(!frontDecoded) { return { status: 401, message: 'Link expirado. Acesse o login e solicite a redefinição de senha novamente.' } }

      const hashedPassword = (await generatePassword(newPassword)).hashedPassword

      // 2, 3 e 4. Busca usuário, valida token de reset (INTEGRAÇÃO DE SEGURANÇA) e atualiza senha
      // + invalida o token (uso único) — tudo em uma única transação
      const result = await authRepository.qResetPassword(frontDecoded.email, frontToken, hashedPassword);

      if (result.outcome === 'user_not_found') { return { status: 401, message: "Usuário não encontrado" } }

      if (result.outcome === 'token_invalid') {
        return { status: 401, message: 'Este link de redefinição já foi utilizado ou revogado. Solicite um novo link.' };
      }

      // 5. Gera a nova sessão para logar o usuário automaticamente
      const payload = { user: result.userId, email: result.email, category: result.categoryId };
      const { token: backendToken, expiresIn, refreshToken } = issueSession(payload)
      const role = payload.category;

      return { status: 200, data: { token: backendToken, expiresIn, role, person: result.personName, refreshToken } };
    }
    catch (error: any) {
      console.error(error);
      if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
        return { status: 401, message: 'Token expirado ou inválido. Solicite a redefinição de senha novamente.' }
      }
      return { status: 500, message: error.message }
    }
  }

  async refresh(req: Request) {
    const expired = { status: 401, message: 'Sua sessão expirou. Faça o login novamente.' }

    try {
      const decoded = verifyRefreshToken(req.body?.refreshToken);
      if (!decoded) { return expired }

      let payload: SessionPayload;
      if ('student' in decoded) {
        const row = await authRepository.qStudentSession(decoded.student);
        if (!row) { return expired }
        payload = { student: row.studentId, ra: `${row.ra}${row.dv}`, category: row.categoryId };
      }
      else {
        const row = await authRepository.qUserSession(decoded.user);
        if (!row) { return expired }
        payload = { user: row.userId, email: row.email, category: row.categoryId };
      }

      // O access token nunca vive além do refresh: 12h após o login é o teto da sessão.
      const remaining = decoded.exp - Math.floor(Date.now() / 1000);
      const { token, expiresIn } = signAccessToken(payload, Math.min(ACCESS_TOKEN_TTL, remaining));

      return { status: 200, data: { token, expiresIn } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  loginResponse(session: { token: string, expiresIn: number, refreshToken: string }, role: any, user: User, pendingTransfers?: any[]): Response {
    const { token, expiresIn, refreshToken } = session
    if(pendingTransfers && pendingTransfers.length > 0) { return { status: 200, data: { token, expiresIn, role, person: user.person.name, pendingTransfers, refreshToken } } }
    return { status: 200, data: { token, expiresIn, role, person: user.person.name, refreshToken } }
  }

  get categories() { return [pc.ADMN, pc.DIRE, pc.VICE, pc.COOR, pc.SECR] }
}

export const loginCtrl = new LoginController();
