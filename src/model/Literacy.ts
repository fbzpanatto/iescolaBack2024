import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
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

  @ManyToOne(() => LiteracyTier, literacyTier => literacyTier.literacies, { nullable: true })
  literacyTier: LiteracyTier

  @Column({ default: false })
  active: boolean
}