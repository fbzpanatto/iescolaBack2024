import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Literacy} from "./Literacy";

@Entity()
export class LiteracyLevel {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  shortName: string

  @OneToMany(() => Literacy, literacy => literacy.literacyLevel)
  literacies: Literacy[]
}
