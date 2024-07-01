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

const customOptions = (value: any) => {
  if (!value || !Array.isArray(value)) { throw new Error("teacherDisciplines must be an array") }
  value = value.map(element => parseInt(element));
  if (!value.every(Number.isInteger)) { throw new Error("teacherDisciplines must be an array of integers")}
  return true;
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
    escape: true
  },
  register: {
    optional: true,
    escape: true
  },
  teacherClasses: {
    optional: true,
    escape: true,
    custom: { options: customOptions },
  },
  teacherDisciplines: {
    optional: true,
    escape: true,
    custom: { options: customOptions },
  },
  category: { optional: true },
  user: { optional: true },
  ...CATEGORY_SCHEMA,
  ...USER_SCHEMA,
}