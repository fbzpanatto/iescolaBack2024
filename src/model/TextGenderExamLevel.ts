import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {TextGenderGrade} from "./TextGenderGrade";
import {TextGenderExamLevelGroup} from "./TextGenderExamLevelGroup";

@Entity()
export class TextGenderExamLevel {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  color: string

  @OneToMany(() => TextGenderGrade, textGenderGrade => textGenderGrade.textGenderExamLevel)
  textGenderGrades: TextGenderGrade[]

  @OneToMany(() => TextGenderExamLevelGroup, textGenderExamLevelGroup => textGenderExamLevelGroup.textGenderExamLevel)
  textGenderExamLevelGroups: TextGenderExamLevelGroup[]
}
