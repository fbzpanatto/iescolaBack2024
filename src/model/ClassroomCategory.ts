import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Classroom } from "./Classroom";

@Entity()
export class ClassroomCategory {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @OneToMany(() => Classroom, classroom => classroom.category)
  classrooms: Classroom[]
}
