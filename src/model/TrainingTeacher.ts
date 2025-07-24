import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from "typeorm"
import { Teacher } from "./Teacher"
import { Training } from "./Training";
import { TrainingTeacherStatus } from "./TrainingTeacherStatus";

@Index(["teacher", "training"], { unique: true })
@Entity()
export class TrainingTeacher {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Teacher, { nullable: false })
  teacher: Teacher;

  @ManyToOne(() => Training, { nullable: false })
  training: Training;

  @ManyToOne(() => TrainingTeacherStatus, { nullable: true })
  status: TrainingTeacherStatus;

  @Column({ nullable: true, length: 100 })
  observation: string

  @Column({ nullable: false, select: false })
  createdAt: Date;

  @Column({ nullable: false, select: false })
  createdByUser: number;

  @Column({ nullable: true, select: false })
  updatedAt: Date;

  @Column({ nullable: true, select: false })
  updatedByUser: number;
}