import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, Index, JoinColumn } from "typeorm";
import { Discipline } from "./Discipline";
import { StudentLesson } from "./StudentLesson";

@Entity()
@Index('uq_lesson_discipline_classroom_number', ['discipline', 'classroomNumber', 'lessonNumber'], { unique: true })
export class Lesson {

  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 150 })
  name: string;

  @ManyToOne(() => Discipline, discipline => discipline.lessons, { nullable: false })
  @JoinColumn({ name: 'disciplineId', foreignKeyConstraintName: 'fk_lesson_discipline' })
  discipline: Discipline;

  @Column({ type: 'tinyint', unsigned: true, comment: 'CLASSROOM_NUMBERS enum (1=FIRST ... 9=NINTH)' })
  classroomNumber: number;

  @Column({ type: 'smallint', unsigned: true, comment: 'sequencial por disciplina+série, gera Aula01, Aula02...' })
  lessonNumber: number;

  @Column()
  s3Key: string;

  @Column({ nullable: true })
  createdByUser: number;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @Column({ nullable: true })
  updatedByUser: number;

  @OneToMany(() => StudentLesson, studentLesson => studentLesson.lesson)
  studentLessons: StudentLesson[];
}