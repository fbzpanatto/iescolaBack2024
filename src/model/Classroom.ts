import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm"
import { School } from "./School";
import { ClassroomCategory } from "./ClassroomCategory";

@Entity()
export class Classroom {

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  shortName: string

  @Column()
  active: boolean

  @ManyToOne(() => School, school => school.classrooms)
  school: School

  @ManyToOne(() => ClassroomCategory, category => category.classrooms)
  category: ClassroomCategory
}
