import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./Student";

@Entity()
export class State {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true})
  name: string

  @Column({ unique: true, length: 2 })
  acronym: string

  @OneToMany(() => Student, s => s.state)
  students: Student[]
}
