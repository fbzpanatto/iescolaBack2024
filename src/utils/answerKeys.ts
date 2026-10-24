import { JwtPayload } from "../interfaces/interfaces";
import { PER_CAT } from "./enums";

export const ANSWER_KEY_FIELDS = ['answer', 'correctLabel', 'optionsOrder', 'correctAnswer'] as const;

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(ANSWER_KEY_FIELDS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') { return false; }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function strip(value: unknown): unknown {
  if (Array.isArray(value)) { return value.map(strip); }
  if (!isPlainObject(value)) { return value; }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) { continue; }
    result[key] = strip(value[key]);
  }
  return result;
}

export function stripAnswerKeys<T>(data: T, user: JwtPayload): T {
  if (user.category !== PER_CAT.ALUN) { return data; }
  return strip(data) as T;
}
