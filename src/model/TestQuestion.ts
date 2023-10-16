import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Descriptor } from "./Descriptor";
import {Test} from "./Test";
import {Question} from "./Question";

@Entity()
export class TestQuestion {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  order: number

  @ManyToOne(() => Test, test => test.testQuestions)
  test: Test

  @ManyToOne(() => Question, question => question.testQuestions)
  question: Question

}
