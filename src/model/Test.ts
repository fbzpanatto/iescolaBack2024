import {Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Length } from "class-validator";
import { Period } from "./Period";
import {Discipline} from "./Discipline";
import {Classroom} from "./Classroom";
import {TestCategory} from "./TestCategory";

@Entity()
export class Test {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @ManyToOne(() => Discipline, discipline => discipline.tests)
  discipline: Discipline

  @ManyToOne(() => Period, period => period.tests)
  period: Period

  @ManyToOne(() => TestCategory, category => category.tests)
  category: TestCategory

  @ManyToMany(() => Classroom)
  @JoinTable({ name: "test_classroom" })
  classrooms: Classroom[]
}
