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

      // TODO: set active to false for all years
      // TODO: set studentClassroom active to false for all studentClassrooms

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
}

export const yearController = new YearController();
