import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ReadingFluencyGroup } from "./ReadingFluencyGroup";

@Entity()
export class ReadingFluencyExam {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  color: string

  @OneToMany(() => ReadingFluencyGroup, readingFluencyGroup => readingFluencyGroup.readingFluencyExam)
  readingFluencyGroup: ReadingFluencyGroup[]
}