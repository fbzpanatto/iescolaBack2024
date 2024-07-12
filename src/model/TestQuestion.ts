import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Test } from "./Test";
import { Question } from "./Question";
import { QuestionGroup } from "./QuestionGroup";
import { StudentQuestion } from "./StudentQuestion";

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

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
