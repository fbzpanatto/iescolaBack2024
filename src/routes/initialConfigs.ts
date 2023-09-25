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
import {DISCIPLINE} from "../mock/discipline";
import {Discipline} from "../model/Discipline";
import {PersonCategory} from "../model/PersonCategory";
import {PERSON_CATEGORY} from "../mock/personCategory";
export const InitialConfigsRouter = Router();

async function createClassroom(school: School, classroom: {name: string, shortName: string, active: boolean, category: number}) {

  const classCategorySource = new dataSourceController(ClassroomCategory).entity
  const classSource = new dataSourceController(Classroom).entity

  const classCategory = await classCategorySource.findOneBy({ id: classroom.category }) as ClassroomCategory
  const newClass = new Classroom()
  newClass.name = classroom.name
  newClass.category = classCategory
  newClass.school = school
  newClass.active = classroom.active
  newClass.shortName = classroom.shortName
  await classSource.save(newClass)
}

InitialConfigsRouter.get('/', async (req, res) => {
  try {
    const personCategorySource = new dataSourceController(PersonCategory).entity
    const bimesterSource = new dataSourceController(Bimester).entity
    const schoolSource = new dataSourceController(School).entity
    const periodSource = new dataSourceController(Period).entity
    const classCategorySource = new dataSourceController(ClassroomCategory).entity
    const disciplineSource = new dataSourceController(Discipline).entity

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
      newClassCategory.active = classroomCategory.active
      await classCategorySource.save(newClassCategory)
    }

    for(let school of SCHOOLS) {
      const newSchool = new School()
      newSchool.name = school.name
      newSchool.shortName = school.shortName
      newSchool.active = school.active
      await schoolSource.save(newSchool)
    }

    const schools = await schoolSource.find() as School[]

    for(let school of schools) {
      for(let classroom of CLASSROOM) {
        if(school.active && classroom.category !== 3) {
          await createClassroom(school, classroom)
        }
        if(!school.active && classroom.category === 3 && !classroom.active) {
          await createClassroom(school, classroom)
        }
      }
    }

    for(let discipline of DISCIPLINE) {
      const newDiscipline = new Discipline()
      newDiscipline.name = discipline.name
      newDiscipline.active = discipline.active
      newDiscipline.shortName = discipline.shortName
      await disciplineSource.save(newDiscipline)
    }

    for(let personCAtegory of PERSON_CATEGORY) {
      const newPersonCategory = new PersonCategory()
      newPersonCategory.name = personCAtegory.name
      newPersonCategory.active = personCAtegory.active
      await personCategorySource.save(newPersonCategory)
    }

    return res.status(200).json({ message: 'Configurações iniciais criadas com sucesso!' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Erro ao criar configurações iniciais!' })
  }
})
