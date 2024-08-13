import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { StudentClassroom } from "./StudentClassroom";
import { ReadingFluencyExam } from "./ReadingFluencyExam";
import { ReadingFluencyLevel } from "./ReadingFluencyLevel";

@Entity()
export class ReadingFluency {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => StudentClassroom, studentClassroom => studentClassroom.readingFluency)
  studentClassroom: StudentClassroom

  @ManyToOne(() => ReadingFluencyExam, readingFluencyExam => readingFluencyExam.readingFluencies)
  readingFluencyExam: ReadingFluencyExam

  @ManyToOne(() => ReadingFluencyLevel, readingFluencyLevel => readingFluencyLevel.readingFluencies)
  readingFluencyLevel: ReadingFluencyLevel

  @Column({ nullable: true })
  observation: string

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
