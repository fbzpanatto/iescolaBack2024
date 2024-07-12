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

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
