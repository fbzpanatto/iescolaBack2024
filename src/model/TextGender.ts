import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { TextGenderGrade } from "./TextGenderGrade";

@Entity()
export class TextGender {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @OneToMany(() => TextGenderGrade, textGenderGrade => textGenderGrade.textGender)
  textGenderGrades: TextGenderGrade[]
}
