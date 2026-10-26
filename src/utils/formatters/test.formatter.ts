import { Test } from "../../model/Test";
import { qAlphaTests, qTest, qTestByIdRow, qTestQuestions, qTestQuestionsFull, qTestQuestionsWithImages, QuestionImageJson, QuestionOptionJson, TestQuestionFull } from "../../interfaces/interfaces";
import { isOptionsOrder, QUESTION_OPTIONS_COUNT, QUESTION_OPTION_LABELS } from "../enums";
import { Helper } from "../helpers";

export class TestFormatter {

  static mapTestRowsToEntity(rows: any[]) {
    const testsMap = new Map<number, any>();

    rows.forEach(row => {
      if (!testsMap.has(row.test_id)) {
        testsMap.set(row.test_id, {
          id: row.test_id,
          name: row.test_name,
          active: row.test_active === 1 || row.test_active === true,
          hideAnswers: row.test_hideAnswers === 1 || row.test_hideAnswers === true,
          createdAt: row.test_createdAt,
          person: row.person_id ? {
            id: row.person_id,
            name: row.person_name
          } : null,
          period: row.period_id ? {
            id: row.period_id,
            year: row.year_id ? { id: row.year_id, name: row.year_name } : null,
            bimester: row.bimester_id ? { id: row.bimester_id, name: row.bimester_name, testName: row.bimester_testName } : null
          } : null,
          category: row.category_id ? {
            id: row.category_id,
            name: row.category_name
          } : null,
          discipline: row.discipline_id ? {
            id: row.discipline_id,
            name: row.discipline_name
          } : null,
          classrooms: []
        });
      }

      const test = testsMap.get(row.test_id);

      if (row.classroom_id) {
        const classroomExists = test.classrooms.find((c: any) => c.id === row.classroom_id);

        if (!classroomExists) {
          test.classrooms.push({
            id: row.classroom_id,
            name: row.classroom_name,
            shortName: row.classroom_shortName,
            school: row.school_id ? {
              id: row.school_id,
              name: row.school_name,
              shortName: row.school_shortName,
              inep: row.school_inep
            } : null
          });
        }
      }
    });

    return Array.from(testsMap.values());
  }

  static testQuestions(arr: qTestQuestions[]) {
    return arr.map(el => ({
      id: el.test_question_id,
      order: el.test_question_order,
      answer: el.test_question_answer ?? 'hidden',
      active: el.test_question_active,
      question: { id: el.question_id, images: el.question_images, title: el.question_title, skill: this.firstSkillRefDesc(this.parseSkills(el.question_skills)), skills: this.parseSkills(el.question_skills) },
      questionGroup: { id: el.question_group_id, name: el.question_group_name }
    }))
  }

  static testQuestionsWithTitle(arr: qTestQuestionsWithImages[]) {
    return arr.map(el => ({
      id: el.test_question_id,
      order: el.test_question_order,
      answer: el.test_question_answer ?? 'hidden',
      active: el.test_question_active,
      question: {
        id: el.question_id,
        title: el.question_title,
        images: this.parseQuestionImages(el.question_images),
        skill: this.firstSkillRefDesc(this.parseSkills(el.question_skills)),
        skills: this.parseSkills(el.question_skills),
        options: this.applyOptionsOrder(this.parseQuestionOptions(el.question_options), el.test_question_options_order)
      },
      questionGroup: { id: el.question_group_id, name: el.question_group_name }
    }))
  }

  // Equivalente ao antigo TestController#getTestQuestions (TypeORM), usado só no fluxo de
  // edição (getById/updateTest). Nulo em vez de objeto com campos undefined quando a FK é
  // nula — replica o comportamento real do TypeORM (LEFT JOIN sem match => relation null).
  static testQuestionsFull(arr: qTestQuestionsFull[]): TestQuestionFull[] {
    return arr.map(el => ({
      id: el.test_question_id,
      order: el.test_question_order,
      answer: el.test_question_answer,
      active: el.test_question_active,
      optionsOrder: isOptionsOrder(el.test_question_options_order) ? el.test_question_options_order : null,
      question: {
        id: el.question_id,
        title: el.question_title,
        correctLabel: el.question_correct_label ?? null,
        person: el.question_person_id != null ? { id: el.question_person_id } : null,
        discipline: el.question_discipline_id != null ? { id: el.question_discipline_id, name: el.question_discipline_name as string } : null,
        classroomCategory: el.question_classroom_category_id != null ? { id: el.question_classroom_category_id, name: el.question_classroom_category_name as string } : null,
        skill: this.firstAlphabeticalSkill(this.parseSkills(el.question_skills)),
        skills: this.parseSkills(el.question_skills),
        questionImages: this.parseQuestionImages(el.question_images),
        options: this.parseQuestionOptions(el.question_options),
        inUse: el.question_in_use
      },
      questionGroup: { id: el.question_group_id, name: el.question_group_name }
    }))
  }

  private static parseQuestionImages(value: unknown): QuestionImageJson[] {
    if (!value) return [];
    if (typeof value === 'string') { return JSON.parse(value) as QuestionImageJson[] }
    return value as QuestionImageJson[];
  }

  private static applyOptionsOrder(options: QuestionOptionJson[], order: string | null): QuestionOptionJson[] {
    if (!isOptionsOrder(order) || options.length !== QUESTION_OPTIONS_COUNT) return options;
    const byLabel = new Map(options.map(option => [option.label, option]));
    if (!QUESTION_OPTION_LABELS.every(label => byLabel.has(label))) return options;
    return [...order].map((originalLabel, i) => ({
      ...(byLabel.get(originalLabel) as QuestionOptionJson),
      id: i + 1,
      label: QUESTION_OPTION_LABELS[i],
      order: i + 1
    }));
  }

  // JSON_ARRAYAGG ignora o ORDER BY da subquery no MySQL 8; a ordenação por order é feita aqui.
  private static parseQuestionOptions(value: unknown): QuestionOptionJson[] {
    if (!value) return [];
    const options = typeof value === 'string' ? JSON.parse(value) as unknown : value;
    if (!Array.isArray(options)) return [];
    return [...(options as QuestionOptionJson[])].sort((a, b) => a.order - b.order);
  }

  // question_skills vem de JSON_ARRAYAGG sobre question_skill. O ORDER BY da subquery não é
  // respeitado pelo MySQL 8 dentro do JSON_ARRAYAGG, então a ordem alfabética por reference
  // (comparação simples < e >, sem localeCompare) é aplicada aqui. Sem vínculos -> null, vira [].
  private static parseSkills(value: unknown): Array<{ id: number, reference: string, description: string }> {
    if (!value) return [];
    const skills = typeof value === 'string'
      ? JSON.parse(value) as Array<{ id: number, reference: string, description: string }>
      : value as Array<{ id: number, reference: string, description: string }>;
    return [...skills].sort((a, b) => a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0);
  }

  // Habilidade que alimenta o campo singular legado `skill`: a 1ª em ordem alfabética por reference,
  // com a mesma comparação (< e >) do parseSkills — logo, sempre igual a skills[0]. É a mesma que
  // question.skillId espelhava.
  private static firstAlphabeticalSkill(skills: Array<{ id: number, reference: string, description: string }>) {
    if (skills.length === 0) { return null }
    return skills.reduce((min, s) => s.reference < min.reference ? s : min);
  }

  // Campo singular legado `skill` dos relatórios/fluxo do aluno ({reference, description}, sem id).
  // Sem habilidade, devolve o mesmo objeto de campos nulos que o LEFT JOIN em question.skillId produzia.
  private static firstSkillRefDesc(skills: Array<{ id: number, reference: string, description: string }>) {
    const first = this.firstAlphabeticalSkill(skills);
    return first ? { reference: first.reference, description: first.description } : { reference: null, description: null };
  }

  static allQuestions(rows: any[], withOptions = false) {
    return rows.map(row => ({
      id: row.q_id,
      title: row.q_title,
      classroomNumber: row.q_classroomNumber,
      active: row.q_active === 1 || row.q_active === true,
      createdAt: Helper.toUtcDate(row.q_createdAt),
      updatedAt: Helper.toUtcDate(row.q_updatedAt),
      createdByUser: row.q_createdByUser,
      updatedByUser: row.q_updatedByUser,
      person: row.person_id ? { id: row.person_id, name: row.person_name, birth: Helper.toUtcDate(row.person_birth) } : null,
      skill: row.skill_id ? {
        id: row.skill_id,
        reference: row.skill_reference,
        description: row.skill_description,
        createdAt: Helper.toUtcDate(row.skill_createdAt),
        updatedAt: Helper.toUtcDate(row.skill_updatedAt),
        createdByUser: row.skill_createdByUser,
        updatedByUser: row.skill_updatedByUser
      } : null,
      skills: this.parseSkills(row.question_skills),
      discipline: row.discipline_id ? { id: row.discipline_id, name: row.discipline_name } : null,
      classroomCategory: row.cc_id ? {
        id: row.cc_id,
        name: row.cc_name,
        createdAt: Helper.toUtcDate(row.cc_createdAt),
        updatedAt: Helper.toUtcDate(row.cc_updatedAt),
        createdByUser: row.cc_createdByUser,
        updatedByUser: row.cc_updatedByUser
      } : null,
      questionImages: this.parseAllQuestionsImages(row.questionImages),
      inUse: Number(row.inUse),
      ...(withOptions ? { options: this.parseQuestionOptions(row.question_options), correctLabel: row.question_correct_label ?? null } : {})
    }))
  }

  private static parseAllQuestionsImages(value: unknown): Array<{ [key: string]: any }> {
    const arr = !value ? [] : (typeof value === 'string' ? JSON.parse(value) : value) as Array<{ [key: string]: any }>;
    return arr.map(img => ({ ...img, active: img.active === 1 || img.active === true }));
  }

  static alphabeticTests(arr: qAlphaTests[]) {
    return arr.map(el => {
      return {
        id: el.test_id,
        active: el.test_active,
        category: { id: el.test_category_id },
        discipline: { id: el.discipline_id, name: el.discipline_name },
        period: {
          id: el.period_id,
          bimester: { id: el.bimester_id, name: el.bimester_name, testName: el.bimester_testName },
          year: { id: el.year_id, name: el.year_name }
        }
      }
    })
  }

  static testFormater(qTest: qTest) {
    return {
      id: qTest.id,
      name: qTest.name,
      createdAt: qTest.createdAt,
      active: qTest.active,
      hideAnswers: qTest.hideAnswers,
      category: { id: qTest.test_category_id, name: qTest.test_category_name },
      period: {
        id: qTest.period_id,
        bimester: { id: qTest.bimester_id, name: qTest.bimester_name, testName: qTest.bimester_testName },
        year: { id: qTest.year_id, name: qTest.year_name }
      },
      discipline: { id: qTest.discipline_id, name: qTest.discipline_name },
    } as unknown as Test
  }

  // Equivalente ao antigo TestController#getById (TypeORM, CONN.findOne com relations
  // period/period.year/period.bimester/discipline/category/person/classrooms.school).
  // Nulo em vez de objeto vazio quando a FK é nula, replicando o comportamento real do
  // TypeORM (LEFT JOIN sem match => relation null). Datas convertidas via toUtcDate: as
  // colunas foram escritas pelo TypeORM como texto UTC sem offset (ver memória
  // aws-server-timezone), mesmo padrão já usado no restante desta migração.
  static hasToken(isTokenRequired: number | boolean | null | undefined): boolean {
    if (isTokenRequired === null || isTokenRequired === undefined) { return true }
    return Number(isTokenRequired) !== 0
  }

  static testByIdFull(rows: qTestByIdRow[]) {
    if (!rows.length) { return null }
    const first = rows[0]

    const classroomsById = new Map<number, any>()
    for (const row of rows) {
      if (row.classroom_id == null || classroomsById.has(row.classroom_id)) { continue }
      classroomsById.set(row.classroom_id, {
        id: row.classroom_id,
        name: row.classroom_name,
        nickname: row.classroom_nickname,
        shortName: row.classroom_shortName,
        school: row.school_id != null ? {
          id: row.school_id,
          name: row.school_name,
          shortName: row.school_shortName,
          inep: row.school_inep,
          active: Boolean(row.school_active)
        } : null
      })
    }

    return {
      id: first.id,
      name: first.name,
      active: Boolean(first.active),
      hideAnswers: Boolean(first.hideAnswers),
      has_token: this.hasToken(first.is_token_required),
      createdAt: Helper.toUtcDate(first.createdAt),
      updatedAt: Helper.toUtcDate(first.updatedAt),
      createdByUser: first.createdByUser,
      updatedByUser: first.updatedByUser,
      endedAt: Helper.toUtcDate(first.endedAt),
      discipline: first.discipline_id != null ? { id: first.discipline_id, name: first.discipline_name } : null,
      period: first.period_id != null ? {
        id: first.period_id,
        year: first.year_id != null ? {
          id: first.year_id,
          name: first.year_name,
          active: Boolean(first.year_active),
          createdAt: Helper.toUtcDate(first.year_createdAt),
          endedAt: Helper.toUtcDate(first.year_endedAt)
        } : null,
        bimester: first.bimester_id != null ? { id: first.bimester_id, name: first.bimester_name, testName: first.bimester_testName } : null
      } : null,
      category: first.category_id != null ? {
        id: first.category_id,
        name: first.category_name,
        startClassroomNumber: first.category_startClassroomNumber,
        endClassroomNumber: first.category_endClassroomNumber
      } : null,
      person: first.person_id != null ? { id: first.person_id, name: first.person_name, birth: Helper.toUtcDate(first.person_birth) } : null,
      classrooms: Array.from(classroomsById.values())
    }
  }

  static testQuestionsFormMultipleTests(queryResult: Array<any>) {

    const allQuestionsRaw = queryResult as any[];

    const questionsByTestId = new Map<number, any[]>();
    for (const question of allQuestionsRaw) {
      const testId = question.test_id;
      if (!questionsByTestId.has(testId)) { questionsByTestId.set(testId, []) }
      questionsByTestId.get(testId)!.push(question);
    }

    const finalMap = new Map();
    for (const [testId, rawQuestions] of questionsByTestId.entries()) {
      finalMap.set(testId, TestFormatter.testQuestions(rawQuestions))
    }

    return finalMap;
  }
}
