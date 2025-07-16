import { Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Training{

  @PrimaryGeneratedColumn()
  id: number


}