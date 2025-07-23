import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Training } from "./Training";

@Entity()
export class TrainingSchedule {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  dateTime: Date;

  @ManyToOne(() => Training, training => training.trainingSchedules, { nullable: false })
  training: Training;

  @Column({ default: true, nullable: false })
  active: boolean;

  @Column({ nullable: false, select: false })
  createdByUser: number;

  @Column({ nullable: false, select: false })
  updatedByUser: number;
}