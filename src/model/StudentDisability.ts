import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./Student";
import { Disability } from "./Disability";

@Entity()
@Index(["student", "disability"], { unique: true })
export class StudentDisability {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Student, student => student.studentDisabilities)
  student: Student

  @ManyToOne(() => Disability, disability => disability.studentDisabilities)
  disability: Disability

  @Column({ nullable: false})
  startedAt: Date

  @Column({ nullable: true })
  endedAt: Date
}
