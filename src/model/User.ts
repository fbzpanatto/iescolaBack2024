import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Person } from "./Person";
import { IsEmail, Max } from "class-validator";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Max(15)
  @Column({ unique: true, nullable: false })
  username: string;

  @Column({ nullable: true, length: 60 })
  @IsEmail({}, { message: "Invalid email address." })
  email: string;

  @Max(8)
  @Column({ nullable: false })
  password: string;

  @OneToOne(() => Person, (p) => p.user)
  @JoinColumn()
  person: Person;
}
