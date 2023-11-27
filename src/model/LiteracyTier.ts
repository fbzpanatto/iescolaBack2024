import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Literacy} from "./Literacy";

@Entity()
export class LiteracyTier {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @OneToMany(() => Literacy, literacy => literacy.literacyTier)
  literacies: Literacy[]
}
