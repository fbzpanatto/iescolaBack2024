import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity()
export class AccessSecurityLog {

  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column({ length: 45 })
  ipAddress: string;

  @Column({ type: "text" })
  requestPath: string;

  @Column({ length: 10 })
  requestMethod: string;

  @Column({ type: "text", nullable: true })
  userAgent: string;

  @Column({ length: 20 })
  confidenceLevel: string;

  @Column({ type: "json" })
  blockedReasons: string[];

  @Column({ type: "json", nullable: true })
  clientHints: object;

  @CreateDateColumn()
  createdAt: Date;
}