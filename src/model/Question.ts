import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Descriptor } from "./Descriptor";
import { TestQuestion } from "./TestQuestion";
import { Person } from "./Person";
import { Skill } from "./Skill";
import { Discipline } from "./Discipline";
import { ClassroomCategory } from "./ClassroomCategory";

@Entity()
export class Question {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "text" })
  title: string

  @Column({ default: 0, nullable: true })
  images: number

  @ManyToOne(() => Descriptor, descriptor => descriptor.questions, { nullable: true })
  descriptor: Descriptor

  @ManyToOne(() => Discipline, discipline => discipline.questions, { nullable: true })
  discipline: Discipline

  @ManyToOne(() => ClassroomCategory, c => c.questions, { nullable: true })
  classroomCategory: ClassroomCategory

  @ManyToOne(() => Skill, skill => skill.questions, { nullable: true })
  skill: Skill

  @OneToMany(() => TestQuestion, testQuestion => testQuestion.question)
  testQuestions: TestQuestion[]

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
