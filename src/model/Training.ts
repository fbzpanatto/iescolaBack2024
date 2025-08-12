import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ClassroomCategory } from "./ClassroomCategory";
import { Discipline } from "./Discipline";
import { Year } from "./Year";
import { TrainingSchedulesMonthsReferences } from "./TrainingSchedulesMonthsReferences";
import { TrainingSchedulesMeeting } from "./TrainingSchedulesMeeting";
import { TrainingTeacher } from "./TrainingTeacher";

@Entity()
export class Training {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  classroom: number

  @ManyToOne(() => Discipline, discipline => discipline.trainings, { nullable: true })
  discipline: Discipline

  @OneToMany(() => TrainingTeacher, t => t.training)
  trainingTeachers: TrainingTeacher[]

  @ManyToOne(() => ClassroomCategory, category => category.trainings, { nullable: false })
  category: ClassroomCategory

  @ManyToOne(() => TrainingSchedulesMonthsReferences, t => t.trainings, { nullable: false })
  monthReference: TrainingSchedulesMonthsReferences

  @ManyToOne(() => TrainingSchedulesMeeting, m => m.trainings, { nullable: false })
  meeting: TrainingSchedulesMeeting

  @ManyToOne(() => Year, year => year.trainings, { nullable: false })
  year: Year

  @Column({ length: 100, nullable: true })
  observation: string

  @Column({ nullable: false, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}