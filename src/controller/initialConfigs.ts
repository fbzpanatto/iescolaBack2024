import { AppDataSource } from "../data-source";
import { EntityTarget, ObjectLiteral } from "typeorm";


class DataSource {
  constructor(private entityName: EntityTarget<ObjectLiteral>) {}
  get entity() { return AppDataSource.getRepository(this.entityName) }

}

export const dataSourceController = DataSource
