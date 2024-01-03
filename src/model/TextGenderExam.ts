import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {TextGenderGrade} from "./TextGenderGrade";

@Entity()
export class TextGenderExam {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  color: string

  @OneToMany(() => TextGenderGrade, textGenderGrade => textGenderGrade.textGenderExam)
  textGenderGrades: TextGenderGrade[]
}
