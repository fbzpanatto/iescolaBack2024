import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import {ReadingFluencyGroup} from "./ReadingFluencyGroup";

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
}