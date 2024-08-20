import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Period } from "./Period";
import { Discipline } from "./Discipline";
import { Classroom } from "./Classroom";
import { TestCategory } from "./TestCategory";
import { Person } from "./Person";
import { TestQuestion } from "./TestQuestion";
import { StudentTestStatus } from "./StudentTestStatus";
import { TestClassroom } from "./TestClassroom";
import { ReadingFluency } from "./ReadingFluency";
import { Alphabetic } from "./Alphabetic";

@Entity()
export class Test {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ default: true })
  active: boolean

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

  @OneToMany(() => TestClassroom, testClassroom => testClassroom.test)
  testClassrooms: TestClassroom[];

  @OneToMany(() => ReadingFluency, readingFluency => readingFluency.test)
  readingFluencies: ReadingFluency[];

  @OneToMany(() => Alphabetic, alphabetic => alphabetic.test)
  alphabetic: Alphabetic[];

  @ManyToMany(() => Classroom, { cascade: true })
  @JoinTable({ name: "test_classroom" })
  classrooms: Classroom[];

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}