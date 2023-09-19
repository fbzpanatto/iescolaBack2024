import { DataSource } from "typeorm"
import { entities } from "./model";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "1234",
  database: "iescoladb2024",
  synchronize: true,
  logging: false,
  entities: entities
})
