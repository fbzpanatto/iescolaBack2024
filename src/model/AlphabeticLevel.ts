import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Alphabetic } from "./Alphabetic";

@Entity()
export class AlphabeticLevel {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  shortName: string

  @Column()
  color: string

  @OneToMany(() => Alphabetic, alphabetic => alphabetic.alphabeticLevel)
  alphabetic: Alphabetic[]
}
