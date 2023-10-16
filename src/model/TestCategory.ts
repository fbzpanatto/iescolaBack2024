import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import { Test } from "./Test";

@Entity()
export class TestCategory {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @OneToMany(() => Test, test => test.category)
  tests: Test[]
}
