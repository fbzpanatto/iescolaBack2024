import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Descriptor } from "./Descriptor";
import {Test} from "./Test";
import {Question} from "./Question";
import {QuestionGroup} from "./QuestionGroup";

@Entity()
export class TestQuestion {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  order: number

  @Column({ nullable: false })
  answer: string

  @ManyToOne(() => Test, test => test.testQuestions)
  test: Test

  @ManyToOne(() => Question, question => question.testQuestions, { cascade: true })
  question: Question

  @ManyToOne(() => QuestionGroup, questionGroup => questionGroup.testQuestions)
  questionGroup: QuestionGroup

  @Column({ default: true })
  active: boolean
}
