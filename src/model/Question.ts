import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Descriptor } from "./Descriptor";
import {TestQuestion} from "./TestQuestion";
import { Person } from "./Person";

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

  @ManyToOne(() => Person, person => person.tests, { nullable: true })
  person: Person

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
