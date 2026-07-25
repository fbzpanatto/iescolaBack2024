import { Schema, Meta } from "express-validator";

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
      options: (value: any, _: Meta) => {
        if (typeof value === "string" || value === null) { return true }
        throw new Error("createdAt must be a string or null");
      }
    }
  },
  endedAt: {
    optional: true,
    escape: true,
    custom: {
      options: (value: any, _: Meta) => {
        if (typeof value === "string" || value === null) { return true }
        throw new Error("createdAt must be a string or null");
      }
    }
  },
}