import {Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import { TestQuestion } from "./TestQuestion";
import { Classroom } from "./Classroom";
import { Student } from "./Student";

@Index(["testQuestion", "student"], { unique: true })
@Index("idx_student_testquestion", ["student", "testQuestion"])
@Entity()
export class StudentQuestion {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  answer: string

  @ManyToOne(() => Student, student => student.studentQuestions)
  student: Student

  @ManyToOne(() => TestQuestion, testQuestion => testQuestion.studentQuestions, { nullable: false })
  testQuestion: TestQuestion

  @ManyToOne(() => Classroom, classroom => classroom.alphabetic, { nullable: true })
  rClassroom: Classroom

  @Column({nullable: true })
  score: number

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
