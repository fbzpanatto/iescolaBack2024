"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const model_1 = require("./model");
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
exports.AppDataSource = new typeorm_1.DataSource({
    type: "mysql",
    // host: "iescoladb2024.cts1jr1mgndt.us-east-1.rds.amazonaws.com",
    host: "localhost",
    port: 3306,
    username: "fbzpanatto",
    password: "fnp181292",
    database: "iescoladb2024",
    synchronize: true,
    logging: false,
    entities: model_1.entities,
    connectTimeout: 60000
});
