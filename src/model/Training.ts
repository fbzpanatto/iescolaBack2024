import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Length } from "class-validator";
import { ClassroomCategory } from "./ClassroomCategory";
import { Discipline } from "./Discipline";

@Entity()
export class Training {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: false })
  @Length(3, 100, { message: "Name must be between 3 and 100 characters." })
  name: string;

  @Column({ nullable: false })
  classroom: number

  @Column({ length: 100, nullable: true })
  observation: string

  @ManyToOne(() => ClassroomCategory, category => category.trainings, { nullable: false })
  category: ClassroomCategory

  @ManyToOne(() => Discipline, discipline => discipline.trainings, { nullable: true })
  discipline: Discipline

  @Column({ nullable: false, select: false })
  createdByUser: number

  @Column({ nullable: false, select: false })
  updatedByUser: number
}