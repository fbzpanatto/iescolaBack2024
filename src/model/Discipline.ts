import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from "typeorm"
import {TeacherClassDiscipline} from "./TeacherClassDiscipline";

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
}
