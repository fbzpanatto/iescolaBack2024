import { Schema } from "express-validator";
import { USER_SCHEMA } from "./user";

export const TEST_QUESTIONS_SCHEMA: Schema = {
  active: {
    optional: true,
    escape: true,
    isBoolean: true,
    toBoolean: true
  },
  answer: {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  order: {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  "questionGroup.id": {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  "questionGroup.name": {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  "question.title": {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  "question.descriptor.id": {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  "question.descriptor.code": {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  "question.descriptor.name": {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  "question.descriptor.topic.id": {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  "question.descriptor.topic.name": {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  "question.descriptor.topic.description": {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  "question.descriptor.topic.classroomCategory.id": {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true
  },
  "question.descriptor.topic.classroomCategory.name": {
    optional: true,
    escape: true,
    isString: true,
    trim: true
  },
  "question.descriptor.topic.classroomCategory.active": {
    optional: true,
    escape: true,
    isBoolean: true,
    toBoolean: true
  },
};

export const TEST_SCHEMA: Schema = {
  bimester: { optional: true },
  'bimester.id': {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  category: { optional: true },
  'category.id': {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  discipline: { optional: true },
  'discipline.id': {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  year: { optional: true },
  'year.id': {
    optional: true,
    escape: true,
    isInt: true,
    toInt: true,
  },
  name: {
    optional: true,
    escape: true,
  },
  active: {
    optional: true,
    escape: true,
    toBoolean: true,
  },
  testQuestions: {
    optional: true
  },
  classroom: {
    optional: true
  },
  user: { optional: true },
  ...USER_SCHEMA,
}