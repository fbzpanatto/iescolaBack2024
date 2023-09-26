import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from "typeorm"
import {TeacherClassDiscipline} from "./TeacherClassDiscipline";

@Entity()
export class Discipline {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column()
  shortName: string

  @Column({default: true})
  active: boolean

  @OneToMany(() => TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.discipline)
  teacherClassDiscipline: TeacherClassDiscipline[]
}
