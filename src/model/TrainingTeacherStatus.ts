import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class TrainingTeacherStatus {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 30 })
  name: string

  @Column({ default: true, nullable: false })
  active: boolean
}