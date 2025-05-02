import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from "typeorm"
import {TeacherClassDiscipline} from "./TeacherClassDiscipline";
import {Topic} from "./Topic";
import {Test} from "./Test";
import {Skill} from "./Skill";

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

  @OneToMany(() => Test, test => test.discipline)
  tests: Test[]

  @OneToMany(() => Topic, topic => topic.discipline)
  topics: Topic[]

  @OneToMany(() => Skill, skill => skill.discipline)
  skills: Skill[]
}
