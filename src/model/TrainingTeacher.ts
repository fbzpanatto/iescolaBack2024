import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm"
import { TrainingTeacherStatus } from "./TrainingTeacherStatus"
import { TrainingSchedule } from "./TrainingSchedule"
import { Teacher } from "./Teacher"

@Entity()
export class TrainingTeacher {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Teacher, { nullable: false })
  teacher: Teacher

  @ManyToOne(() => TrainingSchedule, { nullable: false })
  trainingSchedule: TrainingSchedule

  @ManyToOne(() => TrainingTeacherStatus, { nullable: false })
  status: TrainingTeacherStatus

  @Column({ nullable: false, select: false })
  createdAt: Date

  @Column({ nullable: false, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  updatedByUser: number
}