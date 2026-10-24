import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index, JoinColumn } from "typeorm";
import { Question } from "./Question";
import { QuestionOptionLabel } from "../utils/enums";

@Entity()
@Index('UQ_question_option', ['question', 'label'], { unique: true })
export class QuestionOption {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 2 })
  label: QuestionOptionLabel;

  @Column({ type: 'text' })
  text: string;

  @Column()
  order: number;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Question, question => question.options, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId', foreignKeyConstraintName: 'FK_question_option_question' })
  question: Question;

  @Column({ nullable: true })
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @Column({ nullable: true })
  createdByUser: number;

  @Column({ nullable: true })
  updatedByUser: number;
}
