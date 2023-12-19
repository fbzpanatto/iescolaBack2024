import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./Student";
import { Classroom } from "./Classroom";
import { Year} from "./Year";
import { StudentQuestion } from "./StudentQuestion";
import { StudentTestStatus } from "./StudentTestStatus";
import { Literacy } from "./Literacy";
import { LiteracyFirst } from "./LiteracyFirst";

@Entity()
export class StudentClassroom {

  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Student, student => student.studentClassrooms, { nullable: false })
  student: Student

  @ManyToOne(() => Classroom, classroom => classroom.studentClassrooms, { nullable: false })
  classroom: Classroom

  @ManyToOne(() => Year, year => year.studentClassrooms)
  year: Year

  @OneToMany(() => StudentQuestion, studentQuestion => studentQuestion.studentClassroom)
  studentQuestions: StudentQuestion[]

  @OneToMany(() => StudentTestStatus, studentTestStatus => studentTestStatus.studentClassroom)
  studentStatus: StudentTestStatus[]

  @OneToMany(() => Literacy, literacy => literacy.studentClassroom)
  literacies: Literacy[]

  //TODO: não permitir cadastrar dois números iguais para uma mesma sala de aula
  @Column({ nullable: false })
  rosterNumber: number

  @Column({ nullable: false })
  startedAt: Date

  @Column({ nullable: true })
  endedAt: Date
}
