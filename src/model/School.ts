import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Classroom } from "./Classroom";

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

  @OneToMany(() => Classroom, classroom => classroom.school)
  classrooms: Classroom[]
}
