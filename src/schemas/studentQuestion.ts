import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const STUDENT_QUESTION_SCHEMA: Schema = {
  id: {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
 active: {
    optional: true,
    escape: true,
    isBoolean: true,
    toBoolean: true,
  },
  observation: {
    optional: true,
    escape: true
  },
  test: { optional: true },
  'test.id': {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  'test.name': {
    optional: true,
    escape: true
  },
  'test.createdAt':{
    optional: true,
    escape: true
  },
  user: { optional: true },
  ...USER_SCHEMA,
}