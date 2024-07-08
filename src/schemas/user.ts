import { Schema, Meta } from "express-validator";

export const USER_SCHEMA: Schema = {
  'user.user': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  'user.email': {
    exists: true,
    escape: true,
    isString: true
  },
  'user.category': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  'user.iat': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  'user.exp': {
    exists: true,
    escape: true,
    isInt: true,
    toInt: true
  }
}