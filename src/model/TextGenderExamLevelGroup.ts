import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { TextGender } from "./TextGender";
import { TextGenderExamLevel } from "./TextGenderExamLevel";
import {TextGenderExam} from "./TextGenderExam";

@Entity()
export class TextGenderExamLevelGroup {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => TextGenderExam, textGenderExam => textGenderExam.textGenderExamLevelGroups)
  textGenderExam: TextGenderExam

  @ManyToOne(() => TextGenderExamLevel, textGenderExamLevel => textGenderExamLevel.textGenderExamLevelGroups)
  textGenderExamLevel: TextGenderExamLevel
}
