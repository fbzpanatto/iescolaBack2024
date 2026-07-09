import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Question } from "./Question";

export enum QuestionImageType {
  MAIN = "main",
  SUPPORT = "support"
}

@Entity()
export class QuestionImage {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "enum", enum: QuestionImageType, default: QuestionImageType.SUPPORT })
  type: QuestionImageType

  @Column()
  order: number

  @Column()
  s3Key: string

  @ManyToOne(() => Question, question => question.questionImages)
  question: Question

  @Column({ default: true })
  active: boolean

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}