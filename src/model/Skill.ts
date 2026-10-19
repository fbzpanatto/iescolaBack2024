import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Discipline } from "./Discipline";
import { ClassroomCategory } from "./ClassroomCategory";

@Entity()
export class Skill {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  reference: string

  @Column({ type: "text" })
  description: string

  @ManyToOne(() => ClassroomCategory, classroomCategory => classroomCategory.skills, { nullable: true })
  classroomCategory: ClassroomCategory

  @ManyToOne(() => Discipline, discipline => discipline.skills, { nullable: true })
  discipline: Discipline

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
