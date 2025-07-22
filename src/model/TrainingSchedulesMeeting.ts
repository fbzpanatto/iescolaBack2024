import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Training } from "./Training";

@Entity()
export class TrainingSchedulesMeeting {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 30 })
  name: string

  @OneToMany(()=> Training, t => t.meeting)
  trainings: Training[]
}
