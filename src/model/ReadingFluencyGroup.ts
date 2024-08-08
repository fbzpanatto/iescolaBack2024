import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ReadingFluencyExam } from "./ReadingFluencyExam";
import { ReadingFluencyLevel } from "./ReadingFluencyLevel";

@Entity()
export class ReadingFluencyGroup {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => ReadingFluencyLevel, readingFluencyLevel => readingFluencyLevel.readingFluencyGroup)
  readingFluencyLevel: ReadingFluencyLevel

  @ManyToOne(() => ReadingFluencyExam, readingFluencyExam => readingFluencyExam.readingFluencyGroup)
  readingFluencyExam: ReadingFluencyExam
}
