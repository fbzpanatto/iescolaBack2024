import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, OneToOne, JoinColumn } from "typeorm";
import { Person } from "./Person";
import { Max } from "class-validator";

@Entity()
export class User extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Max(15)
  @Column({ unique: true, nullable: false })
  username: string;

  @Max(8)
  @Column({ nullable: false })
  password: string;

  @OneToOne(() => Person, p => p.user)
  @JoinColumn()
  person: Person;
}
