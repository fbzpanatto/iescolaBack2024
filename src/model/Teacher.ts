import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Person } from "./Person";
import { TeacherClassDiscipline } from "./TeacherClassDiscipline";
import { Transfer } from "./Transfer";
import { IsEmail, Max } from "class-validator";

@Entity()
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Max(60)
  @Column({ nullable: true })
  @IsEmail({}, { message: "Invalid email address." })
  email: string;

  @Column({ nullable: true, length: 20 })
  register: string;

  @OneToOne(() => Person, (person) => person.teacher, { cascade: true })
  @JoinColumn()
  person: Person;

  @OneToMany(
    () => TeacherClassDiscipline,
    (teacherClassDiscipline) => teacherClassDiscipline.teacher,
  )
  teacherClassDiscipline: TeacherClassDiscipline[];

  @OneToMany(() => Transfer, (transfer) => transfer.requester)
  requester: Transfer[];

  @OneToMany(() => Transfer, (transfer) => transfer.receiver)
  receiver: Transfer[];
}
