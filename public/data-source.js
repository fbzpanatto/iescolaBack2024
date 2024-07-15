"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const model_1 = require("./model");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "mysql",
    host: "localhost",
    // host: "iescoladb2024.cts1jr1mgndt.us-east-1.rds.amazonaws.com",
    port: 3306,
    username: "fbzpanatto",
    password: "fnp181292",
    database: "iescoladb2024",
    synchronize: true,
    logging: false,
    entities: model_1.entities,
    connectTimeout: 60000
});
