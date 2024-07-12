import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { StudentDisability } from "./StudentDisability";

@Entity()
export class Disability {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 100 })
  name: string

  @OneToMany(() => StudentDisability, sd => sd.disability)
  studentDisabilities: StudentDisability[]

  @Column({ nullable: true })
  createdAt: Date

  @Column({ nullable: true })
  updatedAt: Date

  @Column({ nullable: true })
  createdByUser: number

  @Column({ nullable: true })
  updatedByUser: number
}
