import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Length } from "class-validator";
import { Period } from "./Period";

@Entity()
export class Bimester {

  @PrimaryGeneratedColumn()
  id: number

  @Length(4, 4)
  @Column({ unique: true})
  name: string

  @OneToMany(() => Period, p => p.bimester)
  periods: Period[]
}
