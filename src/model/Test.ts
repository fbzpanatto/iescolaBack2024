import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Period } from "./Period";
import { Discipline } from "./Discipline";
import { Classroom } from "./Classroom";
import { TestCategory } from "./TestCategory";
import { Person } from "./Person";
import { TestQuestion } from "./TestQuestion";
import { StudentTestStatus } from "./StudentTestStatus";

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

  @ManyToOne(() => Person, person => person.tests)
  person: Person

  @OneToMany(() => Test, test => test.testQuestions)
  testQuestions: TestQuestion[]

  @OneToMany(() => StudentTestStatus, studentTestStatus => studentTestStatus.test)
  studentStatus: StudentTestStatus[]

  @ManyToMany(() => Classroom, { cascade: true })
  @JoinTable({ name: "test_classroom" })
  classrooms: Classroom[]

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}