import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { Test } from "./Test";
import { Classroom } from "./Classroom";

@Entity('test_classroom')
export class TestClassroom {
  @PrimaryColumn()
  testId: number;

  @PrimaryColumn()
  classroomId: number;

  @ManyToOne(() => Test, test => test.testClassrooms)
  @JoinColumn({ name: "testId" })
  test: Test;

  @ManyToOne(() => Classroom, classroom => classroom.testClassrooms)
  @JoinColumn({ name: "classroomId" })
  classroom: Classroom;
}
