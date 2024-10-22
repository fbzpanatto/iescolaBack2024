import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, OneToMany, ManyToOne, Index } from "typeorm"
import { Person } from "./Person";
import { StudentDisability } from "./StudentDisability";
import { StudentClassroom } from "./StudentClassroom";
import { State } from "./State";
import { Transfer} from "./Transfer";
import { AlphabeticFirst } from "./AlphabeticFirst";
import { Alphabetic } from "./Alphabetic";
import { StudentQuestion } from "./StudentQuestion";
import { ReadingFluency } from "./ReadingFluency";

@Index(["ra", "dv"], { unique: true })
@Entity()
export class Student {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Person, person => person.student, { cascade: true })
  @JoinColumn()
  person: Person

  @OneToOne(() => AlphabeticFirst, alphabeticFirst => alphabeticFirst.student)
  alphabeticFirst: AlphabeticFirst;

  @OneToMany(() => Alphabetic, alphabetic => alphabetic.student)
  alphabetic: Alphabetic[];

  @OneToMany(() => ReadingFluency, readingFluency => readingFluency.student)
  readingFluency: ReadingFluency[];

  @OneToMany(() => StudentQuestion, studentQuestion => studentQuestion.student)
  studentQuestions: StudentQuestion[];

  @Column({ nullable: false })
  ra: string;

  @Column({ nullable: true, length: 1 })
  dv: string;

  @ManyToOne(() => State, state => state.students)
  state: State

  @Column({ nullable: true })
  observationOne: string;

  @Column({ nullable: true })
  observationTwo: string;

  @OneToMany(() => StudentDisability, sd => sd.student)
  studentDisabilities: StudentDisability[]

  @OneToMany(() => StudentClassroom, sc => sc.student)
  studentClassrooms: StudentClassroom[]

  @OneToMany(() => Transfer, transfer => transfer.student)
  transfers: Transfer[]

  @Column({ nullable: true, default: true })
  active: boolean;

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
