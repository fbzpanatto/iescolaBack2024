import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"
@Entity()
export class Contract {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 100 })
  name: string

  @Column({ default: true })
  active: boolean
}
