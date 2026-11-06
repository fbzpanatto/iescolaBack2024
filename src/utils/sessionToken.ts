import { decode, sign, verify } from 'jsonwebtoken';

const tokenSecret = process.env.SECRET;

export const ACCESS_TOKEN_TTL = 10800;
export const REFRESH_TOKEN_TTL = 43200;
export const REFRESH_TYPE = 'refresh';

export type SessionPayload =
  | { user: number, email: string, category: number }
  | { student: number, ra: string, category: number };

export type RefreshPayload = SessionPayload & { typ: typeof REFRESH_TYPE, exp: number };

export function signAccessToken(payload: SessionPayload, ttl: number = ACCESS_TOKEN_TTL) {
  const token = sign(payload, tokenSecret ?? '', { expiresIn: ttl });
  const expiresIn = (decode(token) as { exp: number }).exp;
  return { token, expiresIn };
}

export function issueSession(payload: SessionPayload) {
  const { token, expiresIn } = signAccessToken(payload);
  const refreshToken = sign({ ...payload, typ: REFRESH_TYPE }, tokenSecret ?? '', { expiresIn: REFRESH_TOKEN_TTL });
  return { token, expiresIn, refreshToken };
}

export function verifyRefreshToken(refreshToken: unknown): RefreshPayload | null {
  if (typeof refreshToken !== 'string' || !refreshToken) { return null }
  try {
    const decoded = verify(refreshToken, tokenSecret ?? '') as Partial<RefreshPayload>;
    return decoded.typ === REFRESH_TYPE && typeof decoded.exp === 'number' ? decoded as RefreshPayload : null;
  }
  catch { return null }
}
