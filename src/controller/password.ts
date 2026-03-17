import { Request } from "express";
import { resetPasswordEmailService } from "../services/email";
import { sign } from "jsonwebtoken";
import { Helper } from "../utils/helpers";
import { connectionPool } from "../services/db";

const tokenSecret = process.env.SECRET;

class PasswordController {
  constructor() {}

  async requestTokenForResetPassword(req: Request) {
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const email = req.body.email;

      const selectQuery = `
      SELECT u.id, u.email, p.categoryId 
      FROM user u
      INNER JOIN person p ON u.personId = p.id
      WHERE u.email = ?
    `;

      const [userRows] = await conn.query(selectQuery, [email]);
      const uTeacher = (userRows as any[])[0];

      if (!uTeacher) { await conn.rollback(); return { status: 404, message: "Não foi possível encontrar o usuário informado." } }

      // 1. Gera as datas com 24 horas de validade
      const sqlDateTime = Helper.generateDateTime(24);

      // 2. Bloqueia se já houver token válido usando o createdAt (que representa o momento atual)
      const checkTokenQuery = `
      SELECT expiresAt 
      FROM token_reset 
      WHERE userId = ? AND expiresAt > ?
    `;

      const [tokenRows] = await conn.query(checkTokenQuery, [uTeacher.id, sqlDateTime.createdAt]);
      const activeToken = (tokenRows as any[])[0];

      if (activeToken) {
        const message = "Um link de redefinição já foi enviado recentemente. Aguarde o prazo expirar para solicitar novamente, ou verifique sua caixa de entrada/spam."
        await conn.rollback();
        return { status: 200, data: { message }};
      }

      const token = this.createResetToken({ id: uTeacher.id, email: uTeacher.email, category: uTeacher.categoryId });

      // Insere ou atualiza o TOKEN e a expiração na tabela token_reset
      const upsertTokenResetQuery = `
      INSERT INTO token_reset (userId, token, expiresAt) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE token = ?, expiresAt = ?
    `;

      await conn.query(upsertTokenResetQuery, [uTeacher.id, token, sqlDateTime.expiresAt, token, sqlDateTime.expiresAt]);

      await resetPasswordEmailService(uTeacher.email, token);

      await conn.commit();

      const message = "Um link para redefinir sua senha foi enviado para o email informado. Confira sua caixa de entrada.";
      return { status: 200, data: { message }};
    }
    catch (error: any) { if (conn) { await conn.rollback() } console.log('error', error); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  createResetToken(payload: { id: number, email: string, category: number }): string { return sign(payload, tokenSecret ?? '', { expiresIn: 86400 }) }
}

export const passwordController = new PasswordController();