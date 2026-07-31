import { sign, decode } from 'jsonwebtoken';
import { connectionPool } from '../../../src/services/db';

const SECRET = process.env.SECRET || '';

// PER_CAT.ADMN — hardcoded aqui (em vez de importar de src/utils/enums) só pra manter
// este arquivo sem dependência do resto do app além da conexão de banco.
const ADMN_CATEGORY_ID = 1;

async function findAdminRow() {
  const [rows] = await connectionPool.query(
    `SELECT u.id AS userId, u.email, p.categoryId, p.name AS personName FROM user u
     JOIN person p ON u.personId = p.id
     WHERE p.categoryId = ? LIMIT 1`,
    [ADMN_CATEGORY_ID]
  );
  const row = (rows as any[])[0];
  if (!row) throw new Error('Nenhum usuário ADMN encontrado no banco local — não dá pra gerar token.');
  return row as { userId: number; email: string; categoryId: number; personName: string };
}

// Usado pelo script de regressão de API/banco — token de um usuário ADMN real do
// banco local, não um usuário fixo: se o seed mudar, ainda funciona.
export async function mintAdminToken(): Promise<string> {
  const row = await findAdminRow();
  return sign({ user: row.userId, email: row.email, category: row.categoryId }, SECRET, { expiresIn: 3600 });
}

// Usado pelo setup do Playwright (via print-admin-token.ts) — além do token, devolve
// o que o AuthService do front grava no localStorage no login real (role/person),
// pra simular a sessão sem passar pela tela de login nem saber a senha de ninguém.
export async function mintAdminSession(): Promise<{ token: string; role: number; person: string; expiresIn: number }> {
  const row = await findAdminRow();
  const token = sign({ user: row.userId, email: row.email, category: row.categoryId }, SECRET, { expiresIn: 3600 });
  const { exp } = decode(token) as { exp: number };
  return { token, role: row.categoryId, person: row.personName, expiresIn: exp };
}
