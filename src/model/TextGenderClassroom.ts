import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { TextGenderGrade } from "./TextGenderGrade";
import {TextGenderExam} from "./TextGenderExam";
import {TextGender} from "./TextGender";

@Entity()
export class TextGenderClassroom {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  classroomNumber: number

  @ManyToOne(() => TextGender, textGender => textGender.textGenderClassrooms)
  textGender: TextGender
}
