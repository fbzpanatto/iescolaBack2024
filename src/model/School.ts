import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class School {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  shortName: string

  @Column({nullable: true})
  inep: string
}
