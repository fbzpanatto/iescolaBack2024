import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Question } from "./Question";

export enum QuestionBlockType {
  TEXT = "text",
  IMAGE = "image"
}

@Entity()
@Index('IDX_question_block_question_order', ['question', 'order'])
export class QuestionBlock {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  type: QuestionBlockType;

  @Column()
  order: number;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  s3Key: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  caption: string | null;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Question, question => question.blocks, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId', foreignKeyConstraintName: 'FK_question_block_question' })
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
