import { Request, Response, NextFunction } from 'express'
import { check, checkSchema, validationResult } from 'express-validator'
import { YEAR_SCHEMA } from "../schemas/year";
import { STUDENT_SCHEMA } from "../schemas/student";
import { TEACHER_SCHEMA } from "../schemas/teacher";
import { invalidValues, unexpectedFn } from "../utils/bodyValidations";
import { TEST_SCHEMA } from '../schemas/test';

export const VALIDATE_ID = check('id').not().isEmpty().isNumeric()
export const VALIDATE_YEAR_NAME = check('year').not().isEmpty()

//TEST
export const VALIDATE_TEST = checkSchema(TEST_SCHEMA)
export const BODY_VALIDATION_TEST = (req: Request, res: Response, next: NextFunction) => {
  console.log('validationResult', validationResult(req))
  return !validationResult(req).isEmpty() ? invalidValues(res, req) : unexpectedFn(req, res, next, TEST_SCHEMA)
}

//TEACHER
export const VALIDATE_TEACHER = checkSchema(TEACHER_SCHEMA)
export const BODY_VALIDATION_TEACHER = (req: Request, res: Response, next: NextFunction) => {
  console.log('validationResult', validationResult(req))
  return !validationResult(req).isEmpty() ? invalidValues(res, req) : unexpectedFn(req, res, next, TEACHER_SCHEMA)
}

//USER
export const VALIDATE_USER = checkSchema(STUDENT_SCHEMA)
export const BODY_VALIDATION_USER = (req: Request, res: Response, next: NextFunction) => {
  console.log('validationResult', validationResult(req))
  return !validationResult(req).isEmpty() ? invalidValues(res, req) : unexpectedFn(req, res, next, STUDENT_SCHEMA)
}

//YEAR
export const VALIDATE_YEAR = checkSchema(YEAR_SCHEMA)
export const BODY_VALIDATION_YEAR = (req: Request, res: Response, next: NextFunction) => {
  console.log('validationResult', validationResult(req))
  return !validationResult(req).isEmpty() ? invalidValues(res, req) : unexpectedFn(req, res, next, YEAR_SCHEMA)
}