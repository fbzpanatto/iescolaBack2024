if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }

import { DataSource } from "typeorm"
import { entities } from "./model";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: false,
  entities: entities,
  connectTimeout: 60000
})