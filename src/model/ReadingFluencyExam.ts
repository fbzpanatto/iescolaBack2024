import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ReadingFluencyGroup } from "./ReadingFluencyGroup";
import {ReadingFluency} from "./ReadingFluency";

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

  @OneToMany(() => ReadingFluency, readingFluency => readingFluency.readingFluencyExam)
  readingFluencies: ReadingFluency[]
}