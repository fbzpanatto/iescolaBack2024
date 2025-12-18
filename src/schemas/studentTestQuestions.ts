import { Schema } from "express-validator";

export const SUBMIT_TEST_SCHEMA: Schema = {
  user: {
    optional: false
  },
  'user.user': {
    exists: {
      errorMessage: 'User ID is required',
    },
    isInt: {
      errorMessage: 'User ID must be an integer',
    },
    toInt: true,
  },
  'user.ra': {
    exists: {
      errorMessage: 'RA is required',
    },
    isString: {
      errorMessage: 'RA must be a string',
    },
    escape: true,
    trim: true,
  },
  'user.category': {
    exists: {
      errorMessage: 'Category is required',
    },
    isInt: {
      errorMessage: 'Category must be an integer',
    },
    toInt: true,
  },
  'user.iat': {
    exists: {
      errorMessage: 'IAT is required',
    },
    isInt: {
      errorMessage: 'IAT must be an integer',
    },
    toInt: true,
  },
  'user.exp': {
    exists: {
      errorMessage: 'EXP is required',
    },
    isInt: {
      errorMessage: 'EXP must be an integer',
    },
    toInt: true,
  },
  testId: {
    exists: {
      errorMessage: 'Test ID is required',
    },
    isInt: {
      errorMessage: 'Test ID must be an integer',
    },
    toInt: true,
  },
  studentId: {
    exists: {
      errorMessage: 'Student ID is required',
    },
    custom: {
      options: (value) => {
        // Aceita tanto número quanto string
        if (typeof value === 'number' || typeof value === 'string') {
          return true;
        }
        throw new Error('Student ID must be a number or string');
      },
    },
    // Se for numérico em string, converte para número
    customSanitizer: {
      options: (value) => {
        if (!isNaN(Number(value))) {
          return Number(value);
        }
        return value;
      },
    },
  },
  questions: {
    exists: {
      errorMessage: 'Questions array is required',
    },
    isArray: {
      errorMessage: 'Questions must be an array',
      options: { min: 1 }, // Pelo menos uma questão
    },
  },
  'questions.*.studentQuestionId': {
    exists: {
      errorMessage: 'Student Question ID is required',
    },
    isInt: {
      errorMessage: 'Student Question ID must be an integer',
    },
    toInt: true,
  },
  'questions.*.answer': {
    exists: {
      errorMessage: 'Answer is required',
    },
    isString: {
      errorMessage: 'Answer must be a string',
    },
    escape: true,
    trim: true,
  },
  'questions.*.testQuestionId': {
    exists: {
      errorMessage: 'Test Question ID is required',
    },
    isInt: {
      errorMessage: 'Test Question ID must be an integer',
    },
    toInt: true,
  },
  'questions.*.studentId': {
    exists: {
      errorMessage: 'Student ID in question is required',
    },
    isInt: {
      errorMessage: 'Student ID in question must be an integer',
    },
    toInt: true,
  },
  'questions.*.rClassroomId': {
    optional: true, // Pode ser null
    custom: {
      options: (value) => {
        // Aceita null ou número
        if (value === null || value === undefined || typeof value === 'number') {
          return true;
        }
        // Se for string numérica, também aceita
        if (!isNaN(Number(value))) {
          return true;
        }
        throw new Error('rClassroomId must be a number or null');
      },
    },
    customSanitizer: {
      options: (value) => {
        if (value === null || value === undefined) {
          return null;
        }
        if (!isNaN(Number(value))) {
          return Number(value);
        }
        return value;
      },
    },
  },
  token: {
    exists: {
      errorMessage: 'Token is required',
    }
  },
  'token.id': {
    exists: {
      errorMessage: 'Token is required',
    },
  },
  'token.code': {
    exists: {
      errorMessage: 'Token is required',
    },
  }
};