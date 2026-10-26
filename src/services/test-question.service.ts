import { isOptionsOrder, QUESTION_OPTION_LABELS, QUESTION_OPTIONS_COUNT, QuestionOptionLabel } from "../utils/enums";
import { TestQuestionFull } from "../interfaces/interfaces";
import { QuestionImagePosition } from "../model/QuestionImage";
import { HttpError } from "../utils/helpers";
import { testQuestionRepository } from "../repositories/test-question.repository";

const QUESTION_TITLE_MAX_LENGTH = 5000
const QUESTION_OPTION_TEXT_MAX_LENGTH = 1000

type ValidatedQuestionOption = { label: QuestionOptionLabel, text: string, order: number }
type QuestionOptionRow = { id: number, label: string, text: string, order: number }
type NewQuestionInput = { answer?: unknown, optionsOrder?: unknown, question: { id?: unknown, title?: unknown, options?: unknown, images?: unknown } }
export type PreparedNewQuestion = { options: ValidatedQuestionOption[], imagePositions: QuestionImagePosition[], correctLabel: QuestionOptionLabel | null }
export type ReusedResolution = { answer: unknown, optionsOrder: string | null }
export type CurrOptionsView = { options?: unknown[], correctLabel?: string | null }
export type OrderingPlan = { optionsOrder: string | null, previousOrder: string | null, answer: unknown, correctLabel: QuestionOptionLabel | null }
export type ExistingOptionsPlan = { rows: QuestionOptionRow[], validated: ValidatedQuestionOption[] }

class TestQuestionService {

  async getTestQuestions(testId: number) {
    return testQuestionRepository.qTestQuestionsFull(testId)
  }

  podeApagarDoS3(s3Key: string): boolean {
    if (!s3Key) { return false; }
    return s3Key.startsWith('questions/') || s3Key.startsWith('tmp/');
  }

  // Validação defensiva mínima de skills (Fase 3, question-skill-nn): ids inteiros
  // e existentes na tabela skill. Não substitui validação de schema — só evita
  // sincronizar question_skill com lixo. Lança HttpError(400) se algo não bater.
  async validateSkillIds(conn: any, skillIds: number[]): Promise<{ id: number, reference: string, description: string }[]> {
    if (!Array.isArray(skillIds)) { throw new HttpError(400, "skills deve ser um array de ids.") }
    if (skillIds.length === 0) { return [] }

    const uniqueIds = [...new Set(skillIds)];
    if (!uniqueIds.every(id => Number.isInteger(id))) {
      throw new HttpError(400, "skills deve conter apenas ids inteiros.");
    }

    const [ rows ] = await conn.query(`SELECT id, reference, description FROM skill WHERE id IN (?)`, [uniqueIds]);
    const found = rows as { id: number, reference: string, description: string }[];

    if (found.length !== uniqueIds.length) {
      throw new HttpError(400, "uma ou mais habilidades informadas não existem.");
    }

    return found;
  }

  // Habilidades de uma questão NOVA. skills (number[]) tem precedência, inclusive []. Sem skills,
  // o formato antigo question.skill.id (aba antiga do navegador) cria um único vínculo; sem
  // nenhum dos dois, a questão nasce sem habilidade (estado legítimo).
  async resolveNewQuestionSkills(conn: any, question: any): Promise<{ id: number, reference: string, description: string }[]> {
    if (Array.isArray(question.skills)) { return this.validateSkillIds(conn, question.skills) }
    if (question.skill?.id != null) { return this.validateSkillIds(conn, [question.skill.id]) }
    return [];
  }

  private isOptionLabel(value: unknown): value is QuestionOptionLabel {
    return typeof value === 'string' && (QUESTION_OPTION_LABELS as readonly string[]).includes(value);
  }

  private validateQuestionOptions(question: { title?: unknown, options?: unknown }): ValidatedQuestionOption[] {
    const options = question.options;
    if (!Array.isArray(options)) { throw new HttpError(400, "options deve ser um array.") }
    if (options.length !== QUESTION_OPTIONS_COUNT) { throw new HttpError(400, `A questão deve ter exatamente ${QUESTION_OPTIONS_COUNT} alternativas.`) }
    if (typeof question.title === 'string' && question.title.length > QUESTION_TITLE_MAX_LENGTH) {
      throw new HttpError(400, `O título da questão deve ter no máximo ${QUESTION_TITLE_MAX_LENGTH} caracteres.`);
    }

    const labels = new Set<QuestionOptionLabel>();
    const orders = new Set<number>();

    return options.map((option: unknown): ValidatedQuestionOption => {
      if (typeof option !== 'object' || option === null) { throw new HttpError(400, "Alternativa inválida.") }
      const { label, text, order } = option as { label?: unknown, text?: unknown, order?: unknown };

      if (!this.isOptionLabel(label)) { throw new HttpError(400, `Rótulo de alternativa inválido. Use: ${QUESTION_OPTION_LABELS.join(', ')}.`) }
      if (labels.has(label)) { throw new HttpError(400, "Rótulos de alternativas não podem se repetir.") }
      if (typeof order !== 'number' || !Number.isInteger(order)) { throw new HttpError(400, "A ordem da alternativa deve ser um número inteiro.") }
      if (orders.has(order)) { throw new HttpError(400, "Ordens de alternativas não podem se repetir.") }
      if (typeof text !== 'string') { throw new HttpError(400, "O texto da alternativa deve ser uma string.") }

      const trimmed = text.trim();
      if (trimmed.length < 1 || trimmed.length > QUESTION_OPTION_TEXT_MAX_LENGTH) {
        throw new HttpError(400, `O texto da alternativa deve ter entre 1 e ${QUESTION_OPTION_TEXT_MAX_LENGTH} caracteres.`);
      }

      labels.add(label);
      orders.add(order);
      return { label, text: trimmed, order };
    });
  }

  resolveImagePosition(position: unknown): QuestionImagePosition {
    if (position === undefined || position === null) { return QuestionImagePosition.BEFORE }
    if (position === QuestionImagePosition.BEFORE || position === QuestionImagePosition.AFTER) { return position }
    throw new HttpError(400, "Posição de imagem inválida. Use 'before' ou 'after'.");
  }

  resolveImagePositions(images: unknown): QuestionImagePosition[] {
    if (!Array.isArray(images)) { return [] }
    return images.map((img: unknown) => this.resolveImagePosition((img as { position?: unknown } | null)?.position));
  }

  private assertAnswerMatchesOptions(answer: unknown): void {
    const normalized = String(answer ?? '').trim().toUpperCase();
    if (normalized === '') { return }
    if ([...normalized].every(char => this.isOptionLabel(char))) { return }
    throw new HttpError(400, `Resposta inválida para questão com alternativas. Use apenas: ${QUESTION_OPTION_LABELS.join(', ')}.`);
  }

  isSharedQuestion(curr: TestQuestionFull): boolean {
    return (((curr.question as any)?.inUse ?? 0) as number) >= 1;
  }

  prepareNewQuestion(tq: NewQuestionInput): PreparedNewQuestion | null {
    const question = tq.question;
    if (question.id) { return null }

    const imagePositions = this.resolveImagePositions(question.images);
    const sent = Array.isArray(question.options) ? question.options.length > 0 : question.options != null;
    const options = sent ? this.validateQuestionOptions(question) : [];
    if (options.length === 0) { return { options, imagePositions, correctLabel: null } }

    if (this.normalizeOptionsOrder(tq.optionsOrder) !== null) { throw new HttpError(400, "Questão nova não aceita optionsOrder: a ordem digitada é a canônica.") }

    return { options, imagePositions, correctLabel: this.assertSingleLabel(tq.answer) };
  }

  private normalizeOptionsOrder(value: unknown): string | null {
    if (value === undefined || value === null) { return null }
    if (!isOptionsOrder(value)) { throw new HttpError(400, "optionsOrder inválido. Use uma permutação de A, B, C e D.") }
    return value === QUESTION_OPTION_LABELS.join('') ? null : value;
  }

  private assertSingleLabel(answer: unknown): QuestionOptionLabel {
    const normalized = String(answer ?? '').trim().toUpperCase();
    if (!this.isOptionLabel(normalized)) { throw new HttpError(400, `Informe uma única alternativa correta (${QUESTION_OPTION_LABELS.join(', ')}).`) }
    return normalized;
  }

  private displayAnswerFor(correctLabel: QuestionOptionLabel, optionsOrder: string | null): string {
    if (optionsOrder === null) { return correctLabel }
    return String.fromCharCode(65 + optionsOrder.indexOf(correctLabel));
  }

  private canonicalLabelFor(displayLabel: QuestionOptionLabel, optionsOrder: string | null): QuestionOptionLabel {
    if (optionsOrder === null) { return displayLabel }
    return optionsOrder.charAt(displayLabel.charCodeAt(0) - 65) as QuestionOptionLabel;
  }

  async resolveReusedQuestion(conn: any, questionId: number, tq: { answer?: unknown, optionsOrder?: unknown }): Promise<ReusedResolution> {
    const [ rows ] = await conn.query(
      `SELECT q.correctLabel AS correctLabel, (SELECT COUNT(*) FROM question_option o WHERE o.questionId = q.id AND o.active = 1) AS optionsCount FROM question q WHERE q.id = ? LIMIT 1`,
      [questionId]
    );
    const row = (rows as { correctLabel: string | null, optionsCount: number }[])[0];
    if (!row) { throw new HttpError(404, "Questão não encontrada.") }

    const optionsOrder = this.normalizeOptionsOrder(tq.optionsOrder);

    if (Number(row.optionsCount) === 0) {
      if (optionsOrder !== null) { throw new HttpError(400, "optionsOrder não se aplica a questão do modelo antigo.") }
      return { answer: tq.answer, optionsOrder: null };
    }

    if (!this.isOptionLabel(row.correctLabel)) { throw new HttpError(409, "Questão sem gabarito de referência: não pode ser reaproveitada.") }

    return { answer: this.displayAnswerFor(row.correctLabel, optionsOrder), optionsOrder };
  }

  resolveExistingOrdering(curr: TestQuestionFull, next: { answer?: unknown, optionsOrder?: unknown }): OrderingPlan | null {
    const view = curr.question as unknown as CurrOptionsView;
    const hasOptions = Array.isArray(view.options) && view.options.length > 0;

    if (!hasOptions) {
      if (this.normalizeOptionsOrder(next.optionsOrder) !== null) { throw new HttpError(400, "optionsOrder não se aplica a questão do modelo antigo.") }
      return null;
    }

    const previousOrder = (curr as unknown as { optionsOrder?: string | null }).optionsOrder ?? null;
    const requested = next.optionsOrder === undefined ? previousOrder : this.normalizeOptionsOrder(next.optionsOrder);

    if (this.isSharedQuestion(curr)) {
      if (this.isOptionLabel(view.correctLabel)) {
        return { optionsOrder: requested, previousOrder, answer: this.displayAnswerFor(view.correctLabel, requested), correctLabel: null };
      }
      if (requested !== previousOrder) { throw new HttpError(409, "Questão sem gabarito de referência: a ordem das alternativas não pode ser alterada.") }
      return { optionsOrder: previousOrder, previousOrder, answer: curr.answer, correctLabel: null };
    }

    const displayLabel = this.assertSingleLabel(next.answer);
    return { optionsOrder: requested, previousOrder, answer: displayLabel, correctLabel: this.canonicalLabelFor(displayLabel, requested) };
  }

  async prepareExistingQuestionOptions(conn: any, curr: TestQuestionFull, next: any): Promise<ExistingOptionsPlan | null> {
    if (!Array.isArray(next.question?.options)) { return null }

    const isShared = this.isSharedQuestion(curr);
    const [ rowsResult ] = isShared
      ? await conn.query(`SELECT id, label, \`text\`, \`order\` FROM question_option WHERE questionId = ? AND active = 1`, [curr.question.id])
      : await conn.query(`SELECT id, label, \`text\`, \`order\` FROM question_option WHERE questionId = ? FOR UPDATE`, [curr.question.id]);
    const rows = rowsResult as QuestionOptionRow[];

    if (rows.length === 0) { return { rows, validated: [] } }

    const validated = isShared ? [] : this.validateQuestionOptions(next.question);
    this.assertAnswerMatchesOptions(next.answer);

    return { rows, validated };
  }

  optionsDiffer(payload: unknown[], rows: QuestionOptionRow[]): boolean {
    const keyOf = (label: unknown, text: unknown, order: unknown): string => JSON.stringify([String(label), String(text).trim(), Number(order)]);
    const payloadKeys = payload.map(option => {
      const { label, text, order } = (option ?? {}) as { label?: unknown, text?: unknown, order?: unknown };
      return keyOf(label, text, order);
    }).sort();
    const rowKeys = rows.map(row => keyOf(row.label, row.text, row.order)).sort();

    return payloadKeys.length !== rowKeys.length || payloadKeys.some((key, index) => key !== rowKeys[index]);
  }

  async insertQuestionOptions(conn: any, questionId: number, options: ValidatedQuestionOption[], createdAt: Date, userId: number): Promise<void> {
    if (options.length === 0) { return }
    const values = options.map(o => [questionId, o.label, o.text, o.order, createdAt, userId]);
    await conn.query(`INSERT INTO question_option (questionId, label, \`text\`, \`order\`, createdAt, createdByUser) VALUES ?`, [values]);
  }

  async syncQuestionOptions(conn: any, questionId: number, plan: ExistingOptionsPlan, now: Date, userId: number): Promise<void> {
    const { rows, validated } = plan;
    const rowByLabel = new Map(rows.map(row => [row.label, row]));
    const nextLabels = new Set<string>(validated.map(o => o.label));

    const idsToDelete = rows.filter(row => !nextLabels.has(row.label)).map(row => row.id);
    if (idsToDelete.length > 0) {
      await conn.query(`DELETE FROM question_option WHERE id IN (?)`, [idsToDelete]);
    }

    for (const option of validated) {
      const existing = rowByLabel.get(option.label);
      if (!existing) continue;
      if (existing.text === option.text && existing.order === option.order) continue;
      await conn.query(
        `UPDATE question_option SET \`text\` = ?, \`order\` = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
        [option.text, option.order, now, userId, existing.id]
      );
    }

    await this.insertQuestionOptions(conn, questionId, validated.filter(o => !rowByLabel.has(o.label)), now, userId);
  }

  diffs = (original: any, current: any): boolean => {
    if(!original || !current) return false;
    if (original === current) return false;
    if (typeof original !== 'object' || original === null || current === null) return original !== current;
    const originalKeys = Object.keys(original);
    const currentKeys = Object.keys(current);
    if (originalKeys.length !== currentKeys.length) return true;
    for (let key of originalKeys) { if (!currentKeys.includes(key)) return true; if (this.diffs(original[key], current[key])) { return true } }
    return false;
  }

  diffsStrict = (stored: any, incoming: any, ignoreKeys: string[] = []): boolean => {

    if (Object.is(stored, incoming)) return false;

    // um dos lados é null/undefined e o outro não
    if (stored == null || incoming == null) return true;

    if (stored instanceof Date || incoming instanceof Date) {
      const a = stored instanceof Date ? stored.getTime() : new Date(stored).getTime();
      const b = incoming instanceof Date ? incoming.getTime() : new Date(incoming).getTime();
      return a !== b;
    }

    // pelo menos um é primitivo e já sabemos que não são iguais
    if (typeof stored !== 'object' || typeof incoming !== 'object') return true;

    if (Array.isArray(stored) || Array.isArray(incoming)) {
      if (!Array.isArray(stored) || !Array.isArray(incoming)) return true;
      if (stored.length !== incoming.length) return true;
      for (let i = 0; i < stored.length; i++) {
        if (this.diffsStrict(stored[i], incoming[i], ignoreKeys)) return true;
      }
      return false;
    }

    // percorre apenas o que o cliente enviou
    for (const key of Object.keys(incoming)) {
      if (ignoreKeys.includes(key)) continue;
      if (incoming[key] === undefined) continue;
      if (this.diffsStrict(stored[key], incoming[key], ignoreKeys)) return true;
    }

    return false;
  }
}

export const testQuestionService = new TestQuestionService()
