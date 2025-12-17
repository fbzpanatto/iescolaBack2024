import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Person } from "./Person";
import { TeacherClassDiscipline } from "./TeacherClassDiscipline";
import { Transfer } from "./Transfer";
import { IsEmail, Max } from "class-validator";
import {School} from "./School";
import { TrainingTeacher } from "./TrainingTeacher";

@Entity()
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Max(60)
  @Column()
  @IsEmail({}, { message: "Invalid email address." })
  email: string;

  @Column({ nullable: true, length: 20 })
  register: string;

  @OneToOne(() => Person, (person) => person.teacher, { cascade: true })
  @JoinColumn()
  person: Person;

  @ManyToOne(() => School, school => school.teachers, { nullable: true })
  school: School;

  @OneToMany(() => TeacherClassDiscipline, (teacherClassDiscipline) => teacherClassDiscipline.teacher )
  teacherClassDiscipline: TeacherClassDiscipline[];

  @OneToMany(() => TrainingTeacher, trainingTeacher => trainingTeacher.teacher)
  trainingTeachers: TrainingTeacher[]

  @OneToMany(() => Transfer, (transfer) => transfer.requester)
  requester: Transfer[];

  @OneToMany(() => Transfer, (transfer) => transfer.receiver)
  receiver: Transfer[];

  @Column({ nullable: true, length: 100 })
  observation: string

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
