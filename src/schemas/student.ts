import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const STUDENT_SCHEMA: Schema = {
  birth: {
    optional: true,
    escape: true,
    isString: true,
  },
  classroom: {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  classroomName: {
    optional: true,
    escape: true,
    isString: true,
  },
  currentStudentClassroomId: {
    optional: true,
    escape: true
  },
  disabilities: {
    optional: true,
    escape: true,
    custom: {
      options: (value) => {
        if (!value || !Array.isArray(value)) {
          throw new Error("disabilities must be an array");
        }
        // Apply toInt() to each element to convert to integer
        value = value.map(element => parseInt(element));
        if (!value.every(Number.isInteger)) {
          throw new Error("disabilities must be an array of integers");
        }
        return true;
      },
    },
  },
  disabilitiesName: {
    optional: true,
    escape: true,
    isString: true,
  },
  dv: {
    optional: true,
    escape: true,
    isString: true,
  },
  name: {
    optional: true,
    isString: true
  },
  observationOne: {
    optional: true,
    escape: true
  },
  observationTwo: {
    optional: true,
    escape: true
  },
  ra: {
    optional: true,
    escape: true,
    isString: true,
  },
  rosterNumber: {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  state: {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  user: { exists: true },
  ...USER_SCHEMA,
}