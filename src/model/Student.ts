import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, OneToMany, ManyToOne } from "typeorm"
import { Person } from "./Person";
import { StudentDisability } from "./StudentDisability";
import { StudentClassroom } from "./StudentClassroom";
import { State } from "./State";

@Entity()
export class Student {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Person, person => person.student, { cascade: true })
  @JoinColumn()
  person: Person

  @Column({ unique: true, nullable: false })
  ra: string;

  @Column({ nullable: true, length: 1 })
  dv: string;

  @ManyToOne(() => State, state => state.students)
  state: State

  @Column({ nullable: true })
  observationOne: string;

  @Column({ nullable: true })
  observationTwo: string;

  @OneToMany(() => StudentDisability, sd => sd.student, { cascade: true })
  studentDisabilities: StudentDisability[]

  @OneToMany(() => StudentClassroom, sc => sc.student, { cascade: true })
  studentClassrooms: StudentClassroom[]
}
