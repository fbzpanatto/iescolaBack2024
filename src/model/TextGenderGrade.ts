import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { StudentClassroom } from "./StudentClassroom";
import { TextGender } from "./TextGender";
import { TextGenderExam } from "./TextGenderExam";
import { TextGenderExamTier } from "./TextGenderExamTier";
import { TextGenderExamLevel } from "./TextGenderExamLevel";

@Entity()
export class TextGenderGrade {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => StudentClassroom, studentClassroom => studentClassroom.textGenderGrades)
  studentClassroom: StudentClassroom

  @ManyToOne(() => TextGender, textGender => textGender.textGenderGrades)
  textGender: TextGender

  @ManyToOne(() => TextGenderExam, textGenderExam => textGenderExam.textGenderGrades)
  textGenderExam: TextGenderExam

  @ManyToOne(() => TextGenderExamTier, textGenderExamTier => textGenderExamTier.textGenderGrades)
  textGenderExamTier: TextGenderExamTier

  @ManyToOne(() => TextGenderExamLevel, textGenderExamLevel => textGenderExamLevel.textGenderGrades, { nullable: true })
  textGenderExamLevel: TextGenderExamLevel
}
