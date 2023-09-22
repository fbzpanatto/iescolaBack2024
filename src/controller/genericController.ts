import { ObjectLiteral, EntityTarget, FindOneOptions, DeepPartial, SaveOptions, FindManyOptions } from "typeorm";
import { AppDataSource } from "../data-source";

export class GenericController<T> {
  constructor(private entity: EntityTarget<ObjectLiteral>) {}

  async getAllWhere(options: FindManyOptions<ObjectLiteral> | undefined) {
    try {

      const result = await this.repository.find(options);

      return { status: 200, data: result };

    } catch (error: any) {

      return { status: 500, data: { error: true, errorMessage: error.message } }

    }
  }

  async getOneWhere(options: FindOneOptions<ObjectLiteral>) {
    try {

      const result = await this.repository.findOne(options);

      if (!result) { return { status: 404, data: { error: true, errorMessage: 'Data not found' } } }

      return { status: 200, data: result };
    }

    catch (error: any) {

      return { status: 500, data: { error: true, errorMessage: error.message } }

    }
  }

  async saveData(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {

      const result = await this.repository.save(body, options);

      return { status: 201, data: result };

    }
    catch (error: any) {

      return { status: 500, data: { error: true, errorMessage: error.message } }

    }
  }

  async updateOneById(id: any, body: any) {
    try {

      const dataInDataBase = await this.findOneById(id);

      if (!dataInDataBase) { return { status: 404, data: { error: true, errorMessage: 'Data not found' } } }

      for (const key in body) { dataInDataBase[key] = body[key] }

      const result = await this.repository.save(dataInDataBase);

      return { status: 200, data: result };

    } catch (error: any) {

      return { status: 500, data: { error: true, errorMessage: error.message } }

    }
  }

  async deleteOneById(id: any) {
    try {

      const dataToDelete = await this.findOneById(id);

      if (!dataToDelete) { return { status: 404, data: { error: true, errorMessage: 'Data not found' } } }

      const result = await this.repository.delete(dataToDelete);

      return { status: 200, data: result };

    } catch (error: any) {

      return { status: 500, data: { error: true, errorMessage: error.message } }

    }
  }

  async findOneById(id: any) {
    return await this.repository.findOneBy({id: Number(id)});
  }

  get repository() {
    return AppDataSource.getRepository(this.entity);
  }
}
