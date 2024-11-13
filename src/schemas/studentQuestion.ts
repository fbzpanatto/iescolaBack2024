import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const STUDENT_QUESTIONSANSWER_SCHEMA: Schema = {
  id: {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  classroom: { exists: true },
  'classroom.id': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  answer: {
    exists: true,
    escape: true,
    isLength: { options: { max: 2 } }
  },
  studentClassroom: { exists: true },
  testQuestion: { exists: true },
  'studentClassroom.id': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  'testQuestion.id': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  user: { optional: true },
  ...USER_SCHEMA,
}

export const STUDENT_QUESTIONSTATUS_SCHEMA: Schema = {
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
    optional: true
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