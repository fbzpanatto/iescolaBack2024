import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { TestQuestion } from "./TestQuestion";
import { StudentClassroom } from "./StudentClassroom";

@Entity()
export class StudentQuestion {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => StudentClassroom, studentClassroom => studentClassroom.studentQuestions, { nullable: false })
  studentClassroom: StudentClassroom

  @ManyToOne(() => TestQuestion, testQuestion => testQuestion.studentQuestions, { nullable: false })
  testQuestion: TestQuestion

  @Column({ nullable: true })
  answer: string

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
