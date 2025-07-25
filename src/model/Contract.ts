import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { TeacherClassDiscipline } from "./TeacherClassDiscipline";
@Entity()
export class Contract {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 100 })
  name: string

  @OneToMany(() => TeacherClassDiscipline, t => t.contract )
  contracts: TeacherClassDiscipline[];

  @Column({ default: true })
  active: boolean
}
