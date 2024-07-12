import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, OneToMany, ManyToOne, Index } from "typeorm"
import { Person } from "./Person";
import { StudentDisability } from "./StudentDisability";
import { StudentClassroom } from "./StudentClassroom";
import { State } from "./State";
import { Transfer} from "./Transfer";
import { LiteracyFirst } from "./LiteracyFirst";

@Index(["ra", "dv"], { unique: true })
@Entity()
export class Student {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Person, person => person.student, { cascade: true })
  @JoinColumn()
  person: Person

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

  @OneToOne(() => LiteracyFirst, literacyfirst => literacyfirst.student, { cascade: true })
  literacyFirst: LiteracyFirst

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
