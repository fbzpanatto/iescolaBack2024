import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Discipline {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column()
  shortName: string

  @Column({default: true})
  active: boolean
}
