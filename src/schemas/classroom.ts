import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const CLASSROOM_QUERY: Schema = {
  others: {
    in: ['query'],
    optional: true,
    isBoolean: { errorMessage: "O parâmetro 'others' deve ser true ou false" },
    toBoolean: true
  },
  active: {
    in: ['query'],
    optional: true,
    isBoolean: { errorMessage: "O parâmetro 'active' deve ser true ou false" },
    toBoolean: true
  },
  search: {
    in: ['query'],
    optional: true,
    isString: { errorMessage: "O parâmetro 'search' deve ser um texto" },
    trim: true,
    escape: true
  },
  limit: {
    in: ['query'],
    optional: true,
    isInt: { errorMessage: "O parâmetro 'limit' deve ser um número inteiro" },
    toInt: true
  },
  offset: {
    in: ['query'],
    optional: true,
    isInt: { errorMessage: "O parâmetro 'offset' deve ser um número inteiro" },
    toInt: true
  },
  user: { optional: true },
  ...USER_SCHEMA,
};