import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { LiteracyLevel } from "./LiteracyLevel";
import { Student } from "./Student";

@Entity()
export class LiteracyFirst {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Student, student => student.literacyFirst, { nullable: false })
  @JoinColumn()
  student: Student

  @ManyToOne(() => LiteracyLevel, literacyLevel => literacyLevel.literacyFirsts, { nullable: true })
  literacyLevel: LiteracyLevel

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
