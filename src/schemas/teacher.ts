import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const CATEGORY_SCHEMA: Schema = {
  'category.id': {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  'category.name': {
    optional: true,
    escape: true
  },
  'category.active': {
    optional: true,
    escape: true,
    isBoolean: true,
    toBoolean: true,
  }
}

export const TEACHER_SCHEMA: Schema = {
  birth: {
    optional: true,
    escape: true,
    isString: true,
  },
  classesName: {
    optional: true,
    escape: true
  },
  disciplinesName: {
    optional: true,
    escape: true
  },
  email: {
    optional: true,
    escape: true
  },
  name: {
    optional: true,
    escape: true,
    isLength: { options: { min: 3, max: 100 } }
  },
  register: {
    optional: true,
    escape: true
  },
  school: {
    optional: true,
  },
  schoolName: {
    optional: true,
  },
  observation: {
    optional: true,
  },
  teacherClassesDisciplines: {
    optional: true,
  },
  category: { optional: true },
  user: { optional: true },
  ...CATEGORY_SCHEMA,
  ...USER_SCHEMA,
}