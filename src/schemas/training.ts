import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const TRAINING_SCHEMA: Schema = {
  id: {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  category: {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  categoryName: {
    optional: true
  },
  month: {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  monthName: {
    optional: true
  },
  meeting: {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  meetingName: {
    optional: true
  },
  discipline: {
    optional: true
  },
  disciplineName: {
    optional: true
  },
  classroom: {
    optional: true
  },
  classroomName: {
    optional: true
  },
  observation: {
    optional: true
  },
  trainingSchedules: {
    optional: true,
  },
  user: { optional: true },
  ...USER_SCHEMA,
}