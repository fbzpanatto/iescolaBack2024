import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TextGenderExamLevel {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  color: string
}
