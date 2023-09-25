import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm"
import { Person } from "./Person";

@Entity()
export class Teacher {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Person)
  @JoinColumn()
  person: Person
}
