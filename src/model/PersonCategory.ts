import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Person } from "./Person";

@Entity()
export class PersonCategory {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 100 })
  name: string

  @Column({default: true})
  active: boolean

  @OneToMany(()=> Person, p => p.category)
  persons: Person[]
}
