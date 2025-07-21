import { Bimester } from "./Bimester";
import { Classroom } from "./Classroom";
import { ClassroomCategory } from "./ClassroomCategory";
import { Discipline } from "./Discipline";
import { Disability } from "./Disability";
import { Period } from "./Period";
import { Person } from "./Person";
import { PersonCategory } from "./PersonCategory";
import { School } from "./School";
import { State } from "./State";
import { Student } from "./Student";
import { StudentClassroom } from "./StudentClassroom";
import { StudentDisability } from "./StudentDisability";
import { Teacher } from "./Teacher";
import { TeacherClassDiscipline } from "./TeacherClassDiscipline";
import { Transfer } from "./Transfer";
import { TransferStatus } from "./TransferStatus";
import { Year } from "./Year";
import { User } from "./User";
import { Descriptor } from "./Descriptor";
import { Topic } from "./Topic";
import { Test } from "./Test";
import { TestCategory } from "./TestCategory";
import { Question } from "./Question";
import { TestQuestion } from "./TestQuestion";
import { QuestionGroup } from "./QuestionGroup";
import { StudentQuestion } from "./StudentQuestion";
import { StudentTestStatus } from "./StudentTestStatus";
import { TestClassroom } from "./TestClassroom";
import { ReadingFluencyExam } from "./ReadingFluencyExam";
import { ReadingFluencyLevel } from "./ReadingFluencyLevel";
import { ReadingFluencyGroup } from "./ReadingFluencyGroup";
import { ReadingFluency } from "./ReadingFluency";
import { Alphabetic } from "./Alphabetic";
import { AlphabeticLevel } from "./AlphabeticLevel";
import { AlphabeticFirst } from "./AlphabeticFirst";
import { Skill } from "./Skill";
import { Training } from "./Training";
import { TrainingSchedule } from "./TrainingSchedule";
import { TrainingSchedulesMonthsReferences } from "./TrainingSchedulesMonthsReferences";

export const entities = [
  Alphabetic,
  AlphabeticLevel,
  AlphabeticFirst,
  Bimester,
  Classroom,
  ClassroomCategory,
  Descriptor,
  Discipline,
  Disability,
  Person,
  PersonCategory,
  Period,
  Question,
  QuestionGroup,
  TestClassroom,
  Training,
  TrainingSchedule,
  TrainingSchedulesMonthsReferences,
  School,
  State,
  Skill,
  Student,
  StudentClassroom,
  StudentDisability,
  StudentQuestion,
  StudentTestStatus,
  ReadingFluency,
  ReadingFluencyExam,
  ReadingFluencyLevel,
  ReadingFluencyGroup,
  Teacher,
  TeacherClassDiscipline,
  Test,
  TestCategory,
  TestQuestion,
  Topic,
  Transfer,
  TransferStatus,
  User,
  Year,
];
