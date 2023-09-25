import { Entity, Column, PrimaryGeneratedColumn, OneToOne, ManyToOne } from "typeorm"
import { Student } from "./Student";
import { PersonCategory } from "./PersonCategory";

@Entity()
export class Person {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100 })
  name: string

  @Column({ nullable: true })
  birth: Date

  @OneToOne(type => Student, s => s.person)
  student: Student;

  @ManyToOne(type => PersonCategory, c => c.persons)
  category: PersonCategory;
}
