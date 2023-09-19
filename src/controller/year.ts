import { GenericController } from "./genericController";
import { EntityTarget, SaveOptions } from "typeorm";
import { Year } from "../model/Year";
import { Bimester } from "../model/Bimester";
import { Period } from "../model/Period";

class YearController extends GenericController<EntityTarget<Year>> {

  constructor() {
    super(Year);
  }

  override async saveData(body: Year, options: SaveOptions | undefined) {
    try {

      // TODO: set studentClassroom active to false for all studentClassrooms

      await this.endCurrentYear();

      const newYear = new Year();
      newYear.name = body.name;
      newYear.active = body.active;

      const year = await this.repository.save(newYear)

      const bimesters = await (await this.getOtherRepository(Bimester)).find() as Bimester[];

      for(let bimester of bimesters) {
        const period = new Period();
        period.year = year  as Year;
        period.bimester = bimester;

        await (await this.getOtherRepository(Period)).save(period);
      }

      return { status: 201, data: year };


    } catch (error: any) {

      return { status: 500, data: error.message }
    }
  }

  async currentYear() {
    const result = await this.getOneWhere({ where: { active: true }});
    return result.data
  }

  async endCurrentYear() {
    const currentYear = await this.currentYear();
    if (!currentYear.id) { return }
    currentYear.active = false;
    await this.repository.save(currentYear);
  }
}

export const yearController = new YearController();
