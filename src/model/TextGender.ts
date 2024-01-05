import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { TextGenderGrade } from "./TextGenderGrade";
import {TextGenderClassroom} from "./TextGenderClassroom";
import {TextGenderExamLevelGroup} from "./TextGenderExamLevelGroup";

@Entity()
export class TextGender {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @OneToMany(() => TextGenderGrade, textGenderGrade => textGenderGrade.textGender)
  textGenderGrades: TextGenderGrade[]

  @OneToMany(() => TextGenderClassroom, textGenderClassroom => textGenderClassroom.textGender)
  textGenderClassrooms: TextGenderClassroom[]
}
