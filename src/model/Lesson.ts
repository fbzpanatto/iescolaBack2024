import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from "typeorm";
import { Discipline } from "./Discipline";
import { StudentLesson } from "./StudentLesson";

@Entity()
export class Lesson {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Discipline, discipline => discipline.lessons)
  discipline: Discipline;

  @Column()
  classroomNumber: number; // CLASSROOM_NUMBERS

  @Column()
  lessonNumber: number;

  @Column()
  s3Key: string;

  @Column({ nullable: true })
  createdByUser: number;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @Column({ nullable: true })
  updatedByUser: number;

  @OneToMany(() => StudentLesson, studentLesson => studentLesson.lesson)
  studentLessons: StudentLesson[];
}