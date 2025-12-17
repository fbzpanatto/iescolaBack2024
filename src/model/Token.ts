import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Test } from "./Test";
import { Teacher } from "./Teacher";
import { Classroom } from "./Classroom";

@Index(["testId", "teacherId", "classroomId"], { unique: true })
@Entity()
export class TestToken {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 9 })
  code: string;

  @Column()
  testId: number;

  @ManyToOne(() => Test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testId' })
  test: Test

  @Column()
  teacherId: number;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher

  @Column()
  classroomId: number;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom

  @Column({ type: 'smallint' })
  maxUses: number

  @Column({ type: 'smallint', default: 0 })
  currentUses: number;

  @Column("datetime")
  createdAt: Date

  @Column("datetime")
  expiresAt: Date
}