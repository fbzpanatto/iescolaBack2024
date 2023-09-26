import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm"
import { Person } from "./Person";

@Entity()
export class Student {

  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => Person, person => person.student, { cascade: true })
  @JoinColumn()
  person: Person

  @Column({ unique: true, nullable: false })
  ra: string;

  @Column({ nullable: true, length: 1 })
  dv: string;

  @Column({ nullable: true, length: 2 })
  state: string;
}
