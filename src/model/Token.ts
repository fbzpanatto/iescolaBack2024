import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Test } from "./Test";
import { Teacher } from "./Teacher";
import { Classroom } from "./Classroom";

@Index(["code", "test", "teacher", "classroom", "expiresAt"], { unique: true })
@Entity()
export class TestToken {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 9 })
  code: string;

  @ManyToOne(() => Test, test => test.testToken)
  test: Test

  @ManyToOne(() => Teacher, teacher => teacher.testToken)
  teacher: Teacher

  @ManyToOne(() => Classroom, classroom => classroom.testToken)
  classroom: Classroom

  @Column({ type: 'smallint' })
  maxUses: number

  @Column({ type: 'smallint', default: 0 })
  currentUses: number;

  @Column({ default: true })
  isActive: boolean;

  @Column("datetime")
  createdAt: Date

  @Column("datetime")
  expiresAt: Date
}
