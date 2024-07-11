import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { StudentClassroom } from "./StudentClassroom";
import { Test } from "./Test";

@Entity()
export class StudentTestStatus {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => StudentClassroom, studentClassroom => studentClassroom.studentStatus, { nullable: true })
  studentClassroom: StudentClassroom

  @ManyToOne(() => Test, test => test.studentStatus, { nullable: true })
  test: Test

  @Column({ nullable: true })
  active: boolean

  @Column({ nullable: true })
  observation: string

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
