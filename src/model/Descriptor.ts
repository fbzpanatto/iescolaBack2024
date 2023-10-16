import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Length } from "class-validator";
import { Topic } from "./Topic";
import {Question} from "./Question";

@Entity()
export class Descriptor {

  @PrimaryGeneratedColumn()
  id: number

  @Length(2, 2)
  @Column()
  code: string

  @Column()
  name: string

  @OneToMany(() => Question, question => question.descriptor, { cascade: true })
  questions: Question[]

  @ManyToOne(() => Topic, topic => topic.descriptors, { nullable: true})
  topic: Topic
}
