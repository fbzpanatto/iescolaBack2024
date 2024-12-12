import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Classroom } from "./Classroom";
import {Teacher} from "./Teacher";

@Entity()
export class School {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  shortName: string

  @Column({nullable: true})
  inep: string

  @Column({ default: true })
  active: boolean

  @OneToMany(() => Classroom, classroom => classroom.school)
  classrooms: Classroom[]

  @OneToMany(() => Teacher, teacher => teacher.school)
  teachers: Teacher[]
}
