import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index, JoinColumn } from "typeorm";
import { Student } from "./Student";
import { Lesson } from "./Lesson";

@Entity()
@Index('uq_student_lesson', ['student', 'lesson'], { unique: true })
export class StudentLesson {

  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => Student, student => student.studentLessons, { nullable: false })
  @JoinColumn({ name: 'studentId', foreignKeyConstraintName: 'fk_student_lesson_student' })
  student: Student;

  @ManyToOne(() => Lesson, lesson => lesson.studentLessons, { nullable: false })
  @JoinColumn({ name: 'lessonId', foreignKeyConstraintName: 'fk_student_lesson_lesson' })
  lesson: Lesson;

  @Column({ nullable: true, comment: 'gravado só quando o aluno finaliza e envia a nota' })
  executedAt: Date;

  @Column({ nullable: true, type: 'decimal', precision: 5, scale: 2 })
  grade: number;
}