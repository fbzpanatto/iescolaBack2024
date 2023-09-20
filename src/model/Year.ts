import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Length } from "class-validator";
import { Period } from "./Period";

@Entity()
export class Year {

  @PrimaryGeneratedColumn()
  id: number

  @Length(4, 4)
  @Column({ unique: true})
  name: number

  @Column({ default: false })
  active: boolean

  @OneToMany(() => Period, p => p.year)
  periods: Period[]
}
