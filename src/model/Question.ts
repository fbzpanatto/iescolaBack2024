import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Descriptor } from "./Descriptor";
import {TestQuestion} from "./TestQuestion";

@Entity()
export class Question {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @ManyToOne(() => Descriptor, descriptor => descriptor.questions, { nullable: true })
  descriptor: Descriptor

  @OneToMany(() => TestQuestion, testQuestion => testQuestion.question)
  testQuestions: TestQuestion[]
}
