import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Classroom } from "./Classroom";
import {Topic} from "./Topic";
import {Skill} from "./Skill";
import {Training} from "./Training";

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

  @OneToMany(() => Training, training => training.category)
  trainings: Training[]

  @OneToMany(() => Topic, topic => topic.classroomCategory)
  topics: Topic[]

  @OneToMany(() => Skill, skill => skill.classroomCategory)
  skills: Skill[]

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
