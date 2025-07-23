import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { TrainingTeacher } from "./TrainingTeacher";

@Entity()
export class TrainingTeacherStatus {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 30 })
  name: string

  @Column({ default: true, nullable: false })
  active: boolean

  @OneToMany(() => TrainingTeacher, trainingTeacher => trainingTeacher.status)
  trainingTeachers: TrainingTeacher[]
}