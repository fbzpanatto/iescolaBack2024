import {Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import { Student } from "./Student";
import { AlphabeticLevel } from "./AlphabeticLevel";

@Index(["student"], { unique: true })
@Entity()
export class AlphabeticFirst {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Student, student => student.alphabeticFirst, { nullable: false })
  @JoinColumn()
  student: Student

  @ManyToOne(() => AlphabeticLevel, alphabeticLevel => alphabeticLevel.alphabeticFirst, { nullable: true })
  alphabeticFirst: AlphabeticLevel

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
