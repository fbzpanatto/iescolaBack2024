import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./Student";
import { Classroom } from "./Classroom";
import {Year} from "./Year";

@Entity()
export class StudentClassroom {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Student, student => student.studentDisabilities)
  student: Student

  @ManyToOne(() => Classroom, classroom => classroom.studentClassrooms)
  classroom: Classroom

  @ManyToOne(() => Year, year => year.studentClassrooms)
  year: Year

  //TODO: não permitir cadastrar dois números iguais para uma mesma sala de aula
  @Column({ nullable: false })
  rosterNumber: number

  @Column({ nullable: false })
  startedAt: Date

  @Column({ nullable: true })
  endedAt: Date
}
