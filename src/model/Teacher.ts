import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany} from "typeorm"
import { Person } from "./Person";
import {TeacherClassDiscipline} from "./TeacherClassDiscipline";

@Entity()
export class Teacher {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Person, person => person.teacher, { cascade: true })
  @JoinColumn()
  person: Person

  @OneToMany(() => TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.teacher)
  teacherClassDiscipline: TeacherClassDiscipline[]
}
