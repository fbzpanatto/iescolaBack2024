import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Discipline } from "./Discipline";
import { Teacher } from "./Teacher";
import { Classroom } from "./Classroom";
import { Contract } from "./Contract";

@Index(["discipline", "teacher", "classroom"])
@Entity()
export class TeacherClassDiscipline {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Discipline, discipline => discipline.teacherClassDiscipline)
  discipline: Discipline

  @ManyToOne(() => Teacher, teacher => teacher.teacherClassDiscipline)
  teacher: Teacher

  @ManyToOne(() => Classroom, classroom => classroom.teacherClassDiscipline)
  classroom: Classroom

  @ManyToOne(() => Contract, c => c.contracts, { nullable: true })
  contract: Contract

  @Column({ nullable: false})
  startedAt: Date

  @Column({ nullable: true })
  endedAt: Date
}
