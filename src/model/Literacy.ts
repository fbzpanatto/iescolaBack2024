import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { LiteracyLevel } from "./LiteracyLevel";
import { LiteracyTier } from "./LiteracyTier";
import { StudentClassroom } from "./StudentClassroom";

@Entity()
export class Literacy {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => StudentClassroom, studentClassroom => studentClassroom.literacies)
  studentClassroom: StudentClassroom

  @ManyToOne(() => LiteracyLevel, literacyLevel => literacyLevel.literacies, { nullable: true })
  literacyLevel: LiteracyLevel

  @ManyToOne(() => LiteracyTier, literacyTier => literacyTier.literacies, { nullable: false })
  literacyTier: LiteracyTier

  @Column({ nullable: false, default: true })
  toRate: boolean

  @Column({ nullable: true })
  observation: string

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
