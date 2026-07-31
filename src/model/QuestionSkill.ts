import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index, JoinColumn } from "typeorm";
import { Question } from "./Question";
import { Skill } from "./Skill";

@Entity()
@Index('UQ_question_skill', ['question', 'skill'], { unique: true })
export class QuestionSkill {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId', foreignKeyConstraintName: 'FK_question_skill_question' })
  question: Question;

  @ManyToOne(() => Skill, { nullable: false })
  @JoinColumn({ name: 'skillId', foreignKeyConstraintName: 'FK_question_skill_skill' })
  skill: Skill;

  @Column({ nullable: true })
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @Column({ nullable: true })
  createdByUser: number;

  @Column({ nullable: true })
  updatedByUser: number;
}
