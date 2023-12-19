import {Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import { StudentClassroom } from "./StudentClassroom";
import { LiteracyLevel } from "./LiteracyLevel";
import {Student} from "./Student";

@Entity()
export class LiteracyFirst {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Student, student => student.literacyFirst, { nullable: false })
  @JoinColumn()
  student: Student

  @ManyToOne(() => LiteracyLevel, literacyLevel => literacyLevel.literacyFirsts, { nullable: true })
  literacyLevel: LiteracyLevel
}
