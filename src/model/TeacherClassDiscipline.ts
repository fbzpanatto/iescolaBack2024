import {Column, Entity, Index, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm"
import { Discipline } from "./Discipline";
import { Teacher } from "./Teacher";
import { Classroom } from "./Classroom";

@Entity()
@Index(["discipline", "teacher", "classroom"], { unique: true })
export class TeacherClassDiscipline {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Discipline, discipline => discipline.teacherClassDiscipline)
  discipline: Discipline

  @ManyToOne(() => Teacher, teacher => teacher.teacherClassDiscipline)
  teacher: Teacher

  @ManyToOne(() => Classroom, classroom => classroom.teacherClassDiscipline)
  classroom: Classroom

  @Column({ nullable: false})
  startedAt: Date

  @Column({ nullable: true })
  endedAt: Date
}
