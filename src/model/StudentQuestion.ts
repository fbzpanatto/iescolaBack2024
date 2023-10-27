import {Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import { Student } from "./Student";
import { TestQuestion } from "./TestQuestion";

@Index(['student', 'testQuestion'], { unique: true })
@Entity()
export class StudentQuestion {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Student, student => student.studentQuestions)
  student: Student

  @ManyToOne(() => TestQuestion, testQuestion => testQuestion.studentQuestions)
  testQuestion: TestQuestion

  @Column({ nullable: true })
  answer: string
}
