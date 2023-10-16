import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Length } from "class-validator";
import { Topic } from "./Topic";

@Entity()
export class Descriptor {

  @PrimaryGeneratedColumn()
  id: number

  @Length(2, 2)
  @Column()
  code: string

  @Column()
  name: string

  @ManyToOne(() => Topic, topic => topic.descriptors)
  topic: Topic
}
