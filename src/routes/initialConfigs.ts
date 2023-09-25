import { Router } from "express";
import { dataSourceController } from "../controller/initialConfigs";
import { Year } from "../model/Year";
import { Bimester } from "../model/Bimester";
import { School } from "../model/School";
import { Classroom } from "../model/Classroom";
import { ClassroomCategory } from "../model/ClassroomCategory";
import { Period } from "../model/Period";
import { BIMESTER } from "../mock/bimester";
import { CLASSROOM_CATEGORY } from "../mock/classroomCategory";
import { SCHOOLS } from "../mock/school";
import { CLASSROOM } from "../mock/classroom";
export const InitialConfigsRouter = Router();

InitialConfigsRouter.get('/', async (req, res) => {
  try {
    const yearSource = new dataSourceController(Year).entity
    const bimesterSource = new dataSourceController(Bimester).entity
    const schoolSource = new dataSourceController(School).entity
    const periodSource = new dataSourceController(Period).entity
    const classCategorySource = new dataSourceController(ClassroomCategory).entity
    const classSource = new dataSourceController(Classroom).entity

    const newYear = new Year()
    newYear.name = '2023'
    newYear.active = true
    newYear.createdAt = new Date()

    for(let bimester of BIMESTER) {
      const newBimester = new Bimester()
      newBimester.name = bimester.name
      await bimesterSource.save(newBimester)
    }

    const bimesters = await bimesterSource.find() as Bimester[]

    for(let bimester of bimesters) {
      const period = new Period();
      period.year = newYear  as Year;
      period.bimester = bimester;

      await periodSource.save(period)
    }

    for(let classroomCategory of CLASSROOM_CATEGORY) {
      const newClassCategory = new ClassroomCategory()
      newClassCategory.name = classroomCategory.name
      await classCategorySource.save(newClassCategory)
    }

    for(let school of SCHOOLS) {
      const newSchool = new School()
      newSchool.name = school.name
      newSchool.shortName = school.shortName
      await schoolSource.save(newSchool)
    }

    const schools = await schoolSource.find() as School[]

    for(let school of schools) {
      for(let classroom of CLASSROOM) {

        const classCategory = await classCategorySource.findOneBy({ id: classroom.category }) as ClassroomCategory

        const newClass = new Classroom()
        newClass.name = classroom.name
        newClass.category = classCategory
        newClass.school = school
        newClass.active = false
        newClass.shortName = classroom.shortName
        await classSource.save(newClass)
      }
    }
    return res.status(200).json({ message: 'Configurações iniciais criadas com sucesso!' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Erro ao criar configurações iniciais!' })
  }
})
