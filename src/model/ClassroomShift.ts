import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Classroom } from "./Classroom";

@Entity()
export class ClassroomShift {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @OneToMany(() => Classroom, classroom => classroom.shift)
  classrooms: Classroom[]
}
