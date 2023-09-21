import { GenericController } from "./genericController";
import {EntityTarget, IsNull, ObjectLiteral, SaveOptions} from "typeorm";
import { Year } from "../model/Year";
import { Bimester } from "../model/Bimester";
import { Period } from "../model/Period";

// TODO: send endedAt date for the year on the front end before sending body post

import { AppDataSource } from "../data-source";

class YearController extends GenericController<EntityTarget<Year>> {

  constructor() {
    super(Year);
  }

  override async getAllWhere(options: any) {
    try {

      const result = await this.repository.find({
        relations: ['periods.bimester'],
        order: { name: 'DESC', periods: { bimester: { id: 'ASC' } } },
      });

      return { status: 200, data: result };

    } catch (error: any) {

      return { status: 500, data: error.message }

    }
  }

  override async saveData(body: Year, options: SaveOptions | undefined) {
    try {

      // TODO: set studentClassroom active to false for all studentClassrooms

      const nameExists = await this.checkIfExists(body)
      if (nameExists) { return { status: 200, data: { error: true, errorMessage: `O ano ${body.name} já existe.` } } }

      const currentYear = await this.currentYear() as Year
      if(currentYear.id && body.active) { return { status: 200, data: { error: true, errorMessage: `O ano ${currentYear.name} está ativo. Encerre-o antes de criar um novo.` } }}

      const newYear = new Year();
      newYear.name = body.name;
      newYear.active = body.active;
      newYear.createdAt = body.createdAt ?? new Date()

      const bimesters = await AppDataSource.getRepository(Bimester).find() as Bimester[]

      for(let bimester of bimesters) {
        const period = new Period();
        period.year = newYear  as Year;
        period.bimester = bimester;

        await AppDataSource.getRepository(Period).save(period)
      }

      return { status: 201, data: newYear };


    } catch (error: any) {

      return { status: 500, data: { error: true, errorMessage: error.message } }
    }
  }

  async updateOneById(id: any, body: { [x: string]: any; }) {
    try {

      const dataInDataBase = await this.findOneById(id);

      if (!dataInDataBase) { return { status: 404, data: 'Data not found' } }

      const currentYear = await this.currentYear() as Year
      if(currentYear.id && body.active) { return { status: 200, data: { error: true, errorMessage: `O ano ${currentYear.name} já está ativo.` } }}

      for (const key in body) { dataInDataBase[key] = body[key] }

      const result = await this.repository.save(dataInDataBase);

      return { status: 200, data: result };

    } catch (error: any) {

      return { status: 500, data: { error: true, errorMessage: error.message } }

    }
  }

  async currentYear() {
    const result = await this.getOneWhere({ where: { active: true, endedAt: IsNull() }});
    return result.data
  }

  async checkIfExists(body: Year) {
    const result = await this.getOneWhere({ where: { name: body.name }});
    const year = result.data as Year
    return !!year.id
  }
}

export const yearController = new YearController();
