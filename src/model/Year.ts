import {Entity, Column, PrimaryGeneratedColumn, OneToMany, Index} from "typeorm"
import { Length } from "class-validator";
import { Period } from "./Period";
import {StudentClassroom} from "./StudentClassroom";
import {Transfer} from "./Transfer";

@Entity()
export class Year {

  @PrimaryGeneratedColumn()
  id: number

  @Index("year_name_idx")
  @Length(4, 4)
  @Column({ unique: true})
  name: string

  @Column({ default: false })
  active: boolean

  @Column( { nullable: false } )
  createdAt: Date

  @Column({ nullable: true })
  endedAt: Date

  @OneToMany(() => Period, p => p.year)
  periods: Period[]

  @OneToMany(() => StudentClassroom, sc => sc.year)
  studentClassrooms: StudentClassroom[]

  @OneToMany(() => Transfer, t => t.year)
  transfers: Transfer[]
}
