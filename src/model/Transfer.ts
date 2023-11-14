import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { Teacher } from "./Teacher";
import { Student } from "./Student";
import { TransferStatus } from "./TransferStatus";
import { Classroom } from "./Classroom";
import {Year} from "./Year";

@Entity()
export class Transfer {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Teacher, teacher => teacher.requester)
  requester: Teacher

  @ManyToOne(() => Classroom, classroom => classroom.transfers)
  requestedClassroom: Classroom

  @ManyToOne(() => Classroom, classroom => classroom.currentTransfers)
  currentClassroom: Classroom

  @ManyToOne(() => Teacher, teacher => teacher.receiver, { nullable: true })
  receiver: Teacher

  @ManyToOne(() => Student, student => student.transfers)
  student: Student

  @ManyToOne(() => TransferStatus, status => status.transfers)
  status: TransferStatus

  @Column({ nullable: false })
  startedAt: Date

  @Column({ nullable: true })
  endedAt: Date

  @ManyToOne(() => Year, year => year.transfers)
  year: Year
}
