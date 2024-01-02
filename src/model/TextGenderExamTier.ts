import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TextGenderExamTier {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  color: string
}
