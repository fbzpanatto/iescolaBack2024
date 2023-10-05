import { ObjectLiteral, EntityTarget, FindOneOptions, DeepPartial, SaveOptions, FindManyOptions } from "typeorm";
import { AppDataSource } from "../data-source";

export class GenericController<T> {
  constructor(private entity: EntityTarget<ObjectLiteral>) {}

  async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined) {
    try {
      const result = await this.repository.find();
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneByWhere(options: FindOneOptions<ObjectLiteral>) {
    try {
      const result = await this.repository.findOne(options);
      if (!result) { return { status: 404, message: 'Data not found' } }
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneById(id: string | number) {
    try {
      const result = await this.repository.findOneBy({ id: id });
      if (!result) { return { status: 404, message: 'Data not found' } }
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {
      const result = await this.repository.save(body, options);
      return { status: 201, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async createMany(body: DeepPartial<ObjectLiteral>[], options: SaveOptions | undefined) {
    try {
      const result = await this.repository.save(body, options);
      return { status: 201, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateId(id: number | string, body: ObjectLiteral) {
    try {
      const dataInDataBase = await this.repository.findOneBy({ id: id });
      if (!dataInDataBase) { return { status: 404, message: 'Data not found' } }
      for (const key in body) { dataInDataBase[key] = body[key] }
      const result = await this.repository.save(dataInDataBase);
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async deleteId(id: any) {
    try {
      const dataToDelete = await this.repository.findOneBy({ id: id });
      if (!dataToDelete) { return { status: 404, message: 'Data not found' } }
      const result = await this.repository.delete(dataToDelete);
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  get repository() { return AppDataSource.getRepository(this.entity) }
}
