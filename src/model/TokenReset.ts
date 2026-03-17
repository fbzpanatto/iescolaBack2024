import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class TokenReset {

  @PrimaryColumn()
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Nova coluna adicionada para armazenar o JWT.
  // nullable: true garante que os registros antigos não quebrem o banco.
  @Column({ type: "varchar", length: 512, nullable: true })
  token: string;

  @Column("datetime")
  expiresAt: Date;
}