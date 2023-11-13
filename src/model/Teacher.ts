import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany, Column} from "typeorm"
import { Person } from "./Person";
import { TeacherClassDiscipline } from "./TeacherClassDiscipline";
import { Transfer } from "./Transfer";

@Entity()
export class Teacher {

  @PrimaryGeneratedColumn()
  id: number

  @Column({nullable: true})
  email: string

  @Column({nullable: true})
  register: number

  @OneToOne(() => Person, person => person.teacher, { cascade: true })
  @JoinColumn()
  person: Person

  @OneToMany(() => TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.teacher)
  teacherClassDiscipline: TeacherClassDiscipline[]

  @OneToMany(() => Transfer, transfer => transfer.requester)
  requester: Transfer[]

  @OneToMany(() => Transfer, transfer => transfer.receiver)
  receiver: Transfer[]
}
