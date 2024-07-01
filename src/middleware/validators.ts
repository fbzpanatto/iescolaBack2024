import { Request, Response, NextFunction } from 'express'
import { check, checkSchema, validationResult } from 'express-validator'
import { YEAR_SCHEMA } from "../schemas/year";
import { invalidValues, unexpectedFn } from "../utils/bodyValidations";

export const VALIDATE_ID = check('id').not().isEmpty().isNumeric()

//YEAR
export const VALIDATE_YEAR = checkSchema(YEAR_SCHEMA)
export const BODY_VALIDATION_YEAR = (req: Request, res: Response, next: NextFunction) => {
  console.log('validationResult', validationResult(req))
  return !validationResult(req).isEmpty() ? invalidValues(res, req) : unexpectedFn(req, res, next, YEAR_SCHEMA)
}