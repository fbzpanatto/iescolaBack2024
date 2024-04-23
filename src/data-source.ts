import { DataSource } from "typeorm"
import { entities } from "./model";

// export const AppDataSource = new DataSource({
//   type: "mysql",
//   host: process.env.DB_HOST,
//   port: Number(process.env.DB_PORT),
//   username: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
//   synchronize: true,
//   logging: false,
//   entities: entities
// })

export const AppDataSource = new DataSource({
  type: "mysql",
  host: "iescoladb2024.cts1jr1mgndt.us-east-1.rds.amazonaws.com",
  port: 3306,
  username: "fbzpanatto",
  password: "fnp181292",
  database: "iescoladb2024",
  synchronize: true,
  logging: false,
  entities: entities
})