import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AlphabeticLevel } from "./AlphabeticLevel";
import { Test } from "./Test";

@Entity()
export class Alphabetic {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => AlphabeticLevel, alphabeticLevel => alphabeticLevel.alphabetic, { nullable: true })
  alphabeticLevel: AlphabeticLevel

  @ManyToOne(() => Test, test => test.readingFluencies)
  @JoinColumn({ name: "testId" })
  test: Test;

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
