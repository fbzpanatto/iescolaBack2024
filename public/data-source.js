"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const typeorm_1 = require("typeorm");
const model_1 = require("./model");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: false,
    entities: model_1.entities,
    connectTimeout: 60000
});
