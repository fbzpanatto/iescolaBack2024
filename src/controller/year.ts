import { GenericController } from "./genericController";
import { EntityTarget, IsNull, SaveOptions } from "typeorm";
import { Year } from "../model/Year";
import { Bimester } from "../model/Bimester";
import { Period } from "../model/Period";
import { AppDataSource } from "../data-source";

// TODO: send endedAt date for the year on the front end before sending body post
// TODO: set studentClassroom active to false for all studentClassrooms

class YearController extends GenericController<EntityTarget<Year>> {
  constructor() { super(Year) }

  override async getAllWhere(options: any) {
    try {

      const result = await this.repository.find({
        relations: ['periods.bimester'],
        order: { name: 'DESC', periods: { bimester: { id: 'ASC' } } },
      });

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: Year, options: SaveOptions | undefined) {
    try {

      const nameExists = await this.checkIfExists(body)
      if (nameExists && nameExists.name === body.name) { return { status: 400, message: `O ano ${body.name} já existe.` } }

      const currentYear = await this.currentYear() as Year
      if(currentYear && currentYear.active && body.active) { return { status: 400, message: `O ano ${currentYear.name} está ativo. Encerre-o antes de criar um novo.` } }

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

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateId(id: any, body: Year) {
    try {

      const yearToUpdate = await this.findId(id);

      if (!yearToUpdate) { return { status: 404, message: 'Data not found' } }

      const yearByName = await this.checkIfExists(body)
      if(yearByName && yearByName.name === body.name && yearByName.id !== yearToUpdate.id) { return { status: 400, message: `O ano ${body.name} já existe.` } }

      const currentYear = await this.currentYear() as Year
      if(currentYear && currentYear.active && body.active) { return { status: 400, message: `O ano ${currentYear.name} está ativo. Encerre-o antes de criar um novo.` } }

      for (const key in body) { yearToUpdate[key] = body[key as keyof Year] }

      const result = await this.repository.save(yearToUpdate);

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async currentYear() {
    const result = await this.getOneWhere({ where: { active: true, endedAt: IsNull() }});
    return result.data
  }

  async checkIfExists(body: Year) {
    const result = await this.getOneWhere({ where: { name: body.name }});
    return result.data as Year
  }
}

export const yearController = new YearController();
