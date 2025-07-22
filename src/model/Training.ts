import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ClassroomCategory } from "./ClassroomCategory";
import { Discipline } from "./Discipline";
import { TrainingSchedule } from "./TrainingSchedule";
import { Year } from "./Year";
import { TrainingSchedulesMonthsReferences } from "./TrainingSchedulesMonthsReferences";
import { TrainingSchedulesMeeting } from "./TrainingSchedulesMeeting";

@Entity()
export class Training {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  classroom: number

  @Column({ length: 100, nullable: true })
  observation: string

  @OneToMany(() => TrainingSchedule, trainingSchedule => trainingSchedule.training)
  trainingSchedules: TrainingSchedule[]

  @ManyToOne(() => ClassroomCategory, category => category.trainings, { nullable: false })
  category: ClassroomCategory

  @ManyToOne(() => TrainingSchedulesMonthsReferences, t => t.trainings, { nullable: false })
  monthReference: TrainingSchedulesMonthsReferences

  @ManyToOne(() => TrainingSchedulesMeeting, m => m.trainings, { nullable: false })
  meeting: TrainingSchedulesMeeting

  @ManyToOne(() => Year, year => year.trainings, { nullable: false })
  year: Year

  @ManyToOne(() => Discipline, discipline => discipline.trainings, { nullable: true })
  discipline: Discipline

  @Column({ nullable: false, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}