import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Descriptor } from "./Descriptor";
import { Discipline } from "./Discipline";
import { ClassroomCategory } from "./ClassroomCategory";

@Entity()
export class Topic {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @OneToMany(() => Descriptor, descriptor => descriptor.topic, { cascade: true  })
  descriptors: Descriptor[]

  @ManyToOne(() => Discipline, discipline => discipline.topics)
  discipline: Discipline

  @ManyToOne(() => ClassroomCategory, classroomCategory => classroomCategory.topics)
  classroomCategory: ClassroomCategory
}
