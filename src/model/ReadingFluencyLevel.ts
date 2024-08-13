import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import {ReadingFluencyGroup} from "./ReadingFluencyGroup";
import {ReadingFluency} from "./ReadingFluency";

@Entity()
export class ReadingFluencyLevel {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  color: string

  @OneToMany(() => ReadingFluencyGroup, readingFluencyGroup => readingFluencyGroup.readingFluencyLevel)
  readingFluencyGroup: ReadingFluencyGroup[]

  @OneToMany(() => ReadingFluency, readingFluency => readingFluency.readingFluencyExam)
  readingFluencies: ReadingFluency[]
}