import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Length } from "class-validator";
import { Student } from "./Student";
import { PersonCategory } from "./PersonCategory";
import { Teacher } from "./Teacher";
import { User } from "./User";
import { Test } from "./Test";
import { Question } from "./Question";

@Entity()
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  @Length(3, 100, { message: "Name must be between 3 and 100 characters." })
  name: string;

  @Column({ nullable: true })
  birth: Date;

  @OneToOne((type) => Student, (s) => s.person)
  student: Student;

  @OneToOne((type) => Teacher, (s) => s.person)
  teacher: Teacher;

  @OneToMany(() => Test, (test) => test.person)
  tests: Test[];

  @OneToMany(() => Question, (question) => question.person)
  questions: Question[];

  @ManyToOne((type) => PersonCategory, (c) => c.persons)
  category: PersonCategory;

  @OneToOne((type) => User, (u) => u.person)
  user: User;
}
