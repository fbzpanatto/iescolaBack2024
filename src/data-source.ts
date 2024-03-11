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

// DB_HOST=localhost
// DB_PORT=3306
// DB_USER=fbzpanatto
// DB_PASS=fnp181292
// DB_NAME=iescoladb2024

export const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "fbzpanatto",
  password: "fnp181292",
  database: "iescoladb2024",
  synchronize: true,
  logging: false,
  entities: entities
})
