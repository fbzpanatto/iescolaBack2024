import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from "typeorm"
import { School } from "./School";
import { ClassroomCategory } from "./ClassroomCategory";
import { TeacherClassDiscipline } from "./TeacherClassDiscipline";
import { StudentClassroom } from "./StudentClassroom";
import { Transfer } from "./Transfer";
import { TestClassroom } from "./TestClassroom";
import { Alphabetic } from "./Alphabetic";
import { StudentQuestion } from "./StudentQuestion";

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

  @ManyToOne(() => School, school => school.classrooms, { cascade: true })
  school: School

  @ManyToOne(() => ClassroomCategory, category => category.classrooms)
  category: ClassroomCategory

  @OneToMany(() => TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.classroom)
  teacherClassDiscipline: TeacherClassDiscipline[]

  @OneToMany(() => StudentClassroom, studentClassroom => studentClassroom.classroom)
  studentClassrooms: StudentClassroom[]

  @OneToMany(() => Alphabetic, alphabetic => alphabetic.rClassroom)
  alphabetic: Alphabetic[]

  @OneToMany(() => StudentQuestion, studentQuestion => studentQuestion.rClassroom)
  studentQuestion: StudentQuestion[]

  @OneToMany(() => TestClassroom, testClassroom => testClassroom.classroom)
  testClassrooms: TestClassroom[];

  @OneToMany(() => Transfer, transfer => transfer.requestedClassroom)
  transfers: Transfer[]

  @OneToMany(() => Transfer, transfer => transfer.currentClassroom)
  currentTransfers: Transfer[]
}
