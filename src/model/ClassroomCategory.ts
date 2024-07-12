import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Classroom } from "./Classroom";
import {Topic} from "./Topic";

@Entity()
export class ClassroomCategory {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column({default: true, select: false})
  active: boolean

  @OneToMany(() => Classroom, classroom => classroom.category)
  classrooms: Classroom[]

  @OneToMany(() => Topic, topic => topic.classroomCategory)
  topics: Topic[]

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
