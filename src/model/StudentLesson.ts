import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Student } from "./Student";
import { Lesson } from "./Lesson";

@Entity()
export class StudentLesson {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, student => student.studentLessons)
  student: Student;

  @ManyToOne(() => Lesson, lesson => lesson.studentLessons)
  lesson: Lesson;

  @Column({ nullable: true })
  executedAt: Date;

  @Column({ nullable: true, type: 'decimal', precision: 5, scale: 2 })
  grade: number;
}