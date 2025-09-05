import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { TeacherClassDiscipline } from "./TeacherClassDiscipline";
import { Topic } from "./Topic";
import { Test } from "./Test";
import { Skill } from "./Skill";
import { Training } from "./Training";
import { Question } from "./Question";

@Entity()
export class Discipline {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column({select: false})
  shortName: string

  @Column({default: true, select: false})
  active: boolean

  @OneToMany(() => TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.discipline)
  teacherClassDiscipline: TeacherClassDiscipline[]

  @OneToMany(() => Question, question => question.discipline)
  questions: Question[]

  @OneToMany(() => Test, test => test.discipline)
  tests: Test[]

  @OneToMany(() => Training, training => training.discipline)
  trainings: Training[]

  @OneToMany(() => Topic, topic => topic.discipline)
  topics: Topic[]

  @OneToMany(() => Skill, skill => skill.discipline)
  skills: Skill[]
}
