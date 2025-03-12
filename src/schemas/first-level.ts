import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const STUDENT_FIRST_LEVEL_SCHEMA: Schema = {

  student: { exists: true },
  level: { exists: true },
  'student.id': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  'level.id': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  user: { exists: true },
  ...USER_SCHEMA,
}