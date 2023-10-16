import {Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { Year } from "./Year";
import { Bimester } from "./Bimester";
import {Test} from "./Test";

@Entity()
export class Period {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Year, y => y.periods, { cascade: true })
  year: Year

  @ManyToOne(() => Bimester, b => b.periods)
  bimester: Bimester

  @OneToMany(() => Test, t => t.period)
  tests: Test[]
}
