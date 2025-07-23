import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Training } from "./Training";
import {TrainingTeacher} from "./TrainingTeacher";

@Entity()
export class TrainingSchedule {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  dateTime: Date;

  @ManyToOne(() => Training, training => training.trainingSchedules, { nullable: false })
  training: Training

  @OneToMany(() => TrainingTeacher, trainingTeacher => trainingTeacher.trainingSchedule)
  trainingTeachers: TrainingTeacher[]

  @Column({ default: true, nullable: false })
  active: boolean

  @Column({ nullable: false, select: false })
  createdByUser: number

  @Column({ nullable: false, select: false })
  updatedByUser: number
}