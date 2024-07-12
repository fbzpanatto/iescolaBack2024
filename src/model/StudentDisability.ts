import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./Student";
import { Disability } from "./Disability";

@Entity()
export class StudentDisability {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Student, student => student.studentDisabilities, { nullable: false })
  student: Student

  @ManyToOne(() => Disability, disability => disability.studentDisabilities, { nullable: false })
  disability: Disability

  @Column()
  startedAt: Date

  @Column( { nullable: true })
  endedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
