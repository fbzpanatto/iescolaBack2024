import { Entity, Column, PrimaryGeneratedColumn, OneToOne, ManyToOne } from "typeorm"
import { Student } from "./Student";
import { PersonCategory } from "./PersonCategory";
import {Teacher} from "./Teacher";
import {User} from "./User";

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

  @OneToOne(type => Teacher, s => s.person)
  teacher: Teacher;

  @ManyToOne(type => PersonCategory, c => c.persons)
  category: PersonCategory;

  @OneToOne(type => User, u => u.person)
  user: User;
}
