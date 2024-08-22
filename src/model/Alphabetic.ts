import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AlphabeticLevel } from "./AlphabeticLevel";
import { Student } from "./Student";
import { Test } from "./Test";
import { Classroom } from "./Classroom";

@Index(["test", "student"], { unique: true })
@Entity()
export class Alphabetic {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => AlphabeticLevel, alphabeticLevel => alphabeticLevel.alphabetic, { nullable: true })
  alphabeticLevel: AlphabeticLevel

  @ManyToOne(() => Student, student => student.alphabetic)
  student: Student

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
