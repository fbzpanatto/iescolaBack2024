import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const STUDENT_SCHEMA: Schema = {
  name: {
    notEmpty: { errorMessage: "O nome é obrigatório" },
    isString: true,
    trim: true,
  },
  birth: {
    notEmpty: { errorMessage: "A data de nascimento é obrigatória" },
    isISO8601: { errorMessage: "O formato da data deve ser válido (ISO8601)" },
  },
  ra: {
    notEmpty: { errorMessage: "O RA é obrigatório" },
    isString: true,
    escape: true,
    trim: true,
  },
  dv: {
    notEmpty: { errorMessage: "O DV do RA é obrigatório" },
    isString: true,
    escape: true,
    trim: true,
  },
  state: {
    notEmpty: { errorMessage: "O estado é obrigatório" },
    isInt: true,
    toInt: true,
  },
  classroom: {
    notEmpty: { errorMessage: "A sala é obrigatória" },
    isInt: true,
    toInt: true,
  },
  rosterNumber: {
    notEmpty: { errorMessage: "O número da chamada é obrigatório" },
    isInt: true,
    toInt: true,
  },
  classroomName: {
    optional: true,
    isString: true,
    escape: true,
  },
  currentStudentClassroomId: {
    optional: true,
    escape: true,
  },

  // === VALIDAÇÃO DO ARRAY DE DEFICIÊNCIAS ===
  disabilities: {
    optional: true,
    isArray: { errorMessage: "Disabilities deve ser um array" },
  },
  // O curinga ".*" aplica as regras a CADA item do array!
  'disabilities.*': {
    isInt: { errorMessage: "Cada deficiência deve ser um número inteiro" },
    toInt: true, // Isso SIM transforma os ['2', '8'] para [2, 8] no seu req.body final
  },

  disabilitiesName: {
    optional: true,
    isString: true,
    escape: true,
  },

  observationOne: {
    optional: { options: { values: 'null' } },
    isString: true,
    escape: true,
  },

  observationTwo: {
    optional: { options: { values: 'null' } },
    isString: true,
    escape: true,
  },

  user: { exists: true },
  ...USER_SCHEMA,
};