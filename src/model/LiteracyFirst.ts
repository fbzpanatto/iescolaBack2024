import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { StudentClassroom } from "./StudentClassroom";
import { LiteracyLevel } from "./LiteracyLevel";

@Entity()
export class LiteracyFirst {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => StudentClassroom, studentClassroom => studentClassroom.literacyFirsts)
  studentClassroom: StudentClassroom

  @ManyToOne(() => LiteracyLevel, literacyLevel => literacyLevel.literacyFirsts, { nullable: true})
  literacyLevel: LiteracyLevel
}
