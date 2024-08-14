import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { TestQuestion } from "./TestQuestion";

@Entity()
export class QuestionGroup {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true})
  name: string

  @OneToMany(() => TestQuestion, testQuestion => testQuestion.questionGroup)
  testQuestions: TestQuestion[]

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
