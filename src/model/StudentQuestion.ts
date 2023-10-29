import {Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import { Student } from "./Student";
import { TestQuestion } from "./TestQuestion";
import {StudentClassroom} from "./StudentClassroom";

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
}
