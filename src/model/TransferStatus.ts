import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Transfer } from "./Transfer";

@Entity()
export class TransferStatus {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 30 })
  name: string

  @OneToMany(()=> Transfer, t => t.status)
  transfers: Transfer[]
}
