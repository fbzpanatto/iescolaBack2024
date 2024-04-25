"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceController = void 0;
const data_source_1 = require("../data-source");
class DataSource {
    constructor(entityName) {
        this.entityName = entityName;
    }
    get entity() { return data_source_1.AppDataSource.getRepository(this.entityName); }
}
exports.dataSourceController = DataSource;
