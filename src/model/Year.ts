import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Length } from "class-validator";
import { Period } from "./Period";

@Entity()
export class Year {

  @PrimaryGeneratedColumn()
  id: number

  @Length(4, 4)
  @Column({ unique: true})
  name: string

  @Column({ default: false })
  active: boolean

  @Column( { nullable: false } )
  createdAt: Date

  @Column({ nullable: true })
  endedAt: Date

  @OneToMany(() => Period, p => p.year)
  periods: Period[]
}
