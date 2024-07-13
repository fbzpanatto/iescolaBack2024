import { DataSource } from "typeorm"
import { entities } from "./model";

export const AppDataSource = new DataSource({
  type: "mysql",
  // host: "localhost",
  host: "iescoladb2024.cts1jr1mgndt.us-east-1.rds.amazonaws.com",
  port: 3306,
  username: "fbzpanatto",
  password: "fnp181292",
  database: "iescoladb2024",
  synchronize: true,
  logging: false,
  entities: entities,
  connectTimeout: 60000
})