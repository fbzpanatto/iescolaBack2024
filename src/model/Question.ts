import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { TestQuestion } from "./TestQuestion";
import { Person } from "./Person";
import { Discipline } from "./Discipline";
import { ClassroomCategory } from "./ClassroomCategory";
import { QuestionImage } from "./QuestionImage";
import { QuestionOption } from "./QuestionOption";

@Entity()
export class Question {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "text" })
  title: string

  @Column({ nullable: true })
  classroomNumber: number

  @ManyToOne(() => Discipline, discipline => discipline.questions, { nullable: true })
  discipline: Discipline

  @ManyToOne(() => ClassroomCategory, c => c.questions, { nullable: true })
  classroomCategory: ClassroomCategory

  @OneToMany(() => TestQuestion, testQuestion => testQuestion.question)
  testQuestions: TestQuestion[]

  @OneToMany(() => QuestionImage, questionImage => questionImage.question, { cascade: true })
  questionImages: QuestionImage[]

  @OneToMany(() => QuestionOption, option => option.question, { cascade: true })
  options: QuestionOption[]

  @ManyToOne(() => Person, person => person.tests, { nullable: true })
  person: Person

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