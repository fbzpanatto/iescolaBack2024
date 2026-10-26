import { TrainingResult, TrainingWithSchedulesResult } from "../../interfaces/interfaces";

export class TrainingFormatter {

  static trainingsWithSchedules(queryResult: any[]): TrainingWithSchedulesResult[] {
    return queryResult.reduce((acc: any[], row) => {
      let training = acc.find(t => t.id === row.id);

      if (!training) {
        training = {
          id: row.id,
          classroom: row.classroom ?? null,
          category: {
            id: row.categoryId,
            name: row.categoryName
          },
          year: {
            id: row.yearId,
            name: row.yearName
          },
          meeting: {
            id: row.meetingId,
            name: row.meetingName
          },
          month: {
            id: row.monthId,
            name: row.monthName
          },
          discipline: row.disciplineId ? {
            id: row.disciplineId,
            name: row.disciplineName
          } : null,
          trainingSchedules: []
        };
        acc.push(training);
      }

      // Se existe um schedule, adiciona ao array
      if (row.scheduleId) {
        training.trainingSchedules.push({
          id: row.scheduleId,
          dateTime: row.scheduleDateTime,
          active: row.scheduleActive === 1 // Converte para boolean
        });
      }

      return acc;
    }, []);
  }

  static oneTraining(rows: any[]) {
    const firstRow = rows[0];
    const training: TrainingResult = {
      id: firstRow.id,
      meeting: firstRow.meeting,
      classroom: firstRow.classroom,
      observation: firstRow.observation,
      discipline: firstRow.discipline,
      category: firstRow.category,
      month: firstRow.month,
      trainingSchedules: []
    };

    for(let row of rows) {
      if (row.trainingScheduleId) {
        training.trainingSchedules.push({
          id: row.trainingScheduleId,
          trainingId: row.training,
          dateTime: row.dateTime,
          active: row.active === 1
        });
      }
    }

    return training;
  }

  static formatTrainings(queryResult: any[]) {
    return queryResult as Array<{
      id: number,
      classroom: string,
      observation: string,
      discipline: string,
      category: string,
      meeting: string,
      month: string,
      year: string,
      createdBy: string,
    }>
  }
}
