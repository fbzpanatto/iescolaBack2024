import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Year } from "./Year";
import { Bimester } from "./Bimester";

@Entity()
export class Period {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Year, y => y.periods, { cascade: true })
  year: Year

  @ManyToOne(() => Bimester, b => b.periods)
  bimester: Bimester
}
