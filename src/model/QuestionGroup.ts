import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Length } from "class-validator";
import { Period } from "./Period";
import {TestQuestion} from "./TestQuestion";

@Entity()
export class QuestionGroup {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true})
  name: string

  @OneToMany(() => TestQuestion, testQuestion => testQuestion.questionGroup)
  testQuestions: TestQuestion[]
}
