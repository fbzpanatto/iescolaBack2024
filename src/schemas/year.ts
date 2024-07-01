import { Schema, Meta } from "express-validator";
import { USER_SCHEMA } from "./user";

export const YEAR_SCHEMA: Schema = {
  active: {
    optional: true,
    escape: true,
    isBoolean: true,
    toBoolean: true,
  },
  name: {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  createdAt: {
    optional: true,
    escape: true,
    custom: {
      options: (value: any, meta: Meta) => {
        if (typeof value === "string" || value === null) { return true }
        throw new Error("createdAt must be a string or null");
      }
    }
  },
  endedAt: {
    optional: true,
    escape: true,
    custom: {
      options: (value: any, meta: Meta) => {
        if (typeof value === "string" || value === null) { return true }
        throw new Error("createdAt must be a string or null");
      }
    }
  },
  user: { exists: true },
  ...USER_SCHEMA,
}