import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Descriptor } from "./Descriptor";
import {Test} from "./Test";
import {Question} from "./Question";
import {QuestionGroup} from "./QuestionGroup";
import {StudentQuestion} from "./StudentQuestion";

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

  @OneToMany(() => StudentQuestion, studentQuestion => studentQuestion.testQuestion)
  studentQuestions: StudentQuestion[]

  @Column({ default: true })
  active: boolean

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
