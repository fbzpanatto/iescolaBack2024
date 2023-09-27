import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany} from "typeorm"
import { School } from "./School";
import { ClassroomCategory } from "./ClassroomCategory";
import {TeacherClassDiscipline} from "./TeacherClassDiscipline";

@Entity()
export class Classroom {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  shortName: string

  @Column({select: false})
  active: boolean

  @ManyToOne(() => School, school => school.classrooms)
  school: School

  @ManyToOne(() => ClassroomCategory, category => category.classrooms)
  category: ClassroomCategory

  @OneToMany(() => TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.classroom)
  teacherClassDiscipline: TeacherClassDiscipline[]
}
