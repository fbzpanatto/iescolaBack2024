import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from "typeorm"
import { Teacher } from "./Teacher"
import { Training } from "./Training";

@Index(["teacher", "training"], { unique: true })
@Entity()
export class TrainingTeacher {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Teacher, { nullable: false })
  teacher: Teacher;

  @ManyToOne(() => Training, { nullable: false })
  training: Training;

  @Column()
  status: string;

  @Column({ nullable: false, select: false })
  createdAt: Date;

  @Column({ nullable: false, select: false })
  createdByUser: number;

  @Column({ nullable: true, select: false })
  updatedAt: Date;

  @Column({ nullable: true, select: false })
  updatedByUser: number;
}