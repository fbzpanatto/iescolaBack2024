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

  @Column({ nullable: true, select: false })
  createdAt: Date

  @Column({ nullable: true, select: false })
  updatedAt: Date

  @Column({ nullable: true, select: false })
  createdByUser: number

  @Column({ nullable: true, select: false })
  updatedByUser: number
}
