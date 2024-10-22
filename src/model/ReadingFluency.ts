import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ReadingFluencyExam } from "./ReadingFluencyExam";
import { ReadingFluencyLevel } from "./ReadingFluencyLevel";
import { Test } from "./Test";
import { Student } from "./Student";
import { Classroom } from "./Classroom";

@Entity()
export class ReadingFluency {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Student, student => student.readingFluency)
  student: Student

  @ManyToOne(() => ReadingFluencyExam, readingFluencyExam => readingFluencyExam.readingFluencies)
  readingFluencyExam: ReadingFluencyExam

  @ManyToOne(() => ReadingFluencyLevel, readingFluencyLevel => readingFluencyLevel.readingFluencies)
  readingFluencyLevel: ReadingFluencyLevel

  @ManyToOne(() => Test, test => test.readingFluencies)
  @JoinColumn({ name: "testId" })
  test: Test;

  @ManyToOne(() => Classroom, classroom => classroom.alphabetic, { nullable: true })
  rClassroom: Classroom

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
