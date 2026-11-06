import { HttpError } from "./helpers";

const REFERENCE_MAX_LENGTH = 255

export interface NewSkillInput { reference: string, description: string }
export interface NewSkillPlan { reference: string, description: string, classroomCategoryId: number }
export interface NewSkillQuestionInput { question?: { id?: unknown, newSkillReferences?: unknown, classroomCategory?: { id?: unknown } } }
export interface NewSkillsPlan { toCreate: NewSkillPlan[], referenced: string[] }

const validateNewSkillInputs = (newSkills: unknown): Map<string, string> => {
  if (newSkills === undefined || newSkills === null) { return new Map() }
  if (!Array.isArray(newSkills)) { throw new HttpError(400, 'newSkills deve ser um array.') }

  const descriptionByReference = new Map<string, string>();
  for (const entry of newSkills as Partial<NewSkillInput>[]) {
    const reference = typeof entry?.reference === 'string' ? entry.reference.trim() : '';
    const description = typeof entry?.description === 'string' ? entry.description.trim() : '';
    if (!reference || reference.length > REFERENCE_MAX_LENGTH) { throw new HttpError(400, `A referência da habilidade deve ter entre 1 e ${REFERENCE_MAX_LENGTH} caracteres.`) }
    if (!description) { throw new HttpError(400, `A habilidade ${reference} está sem descrição.`) }
    if (descriptionByReference.has(reference)) { throw new HttpError(400, `A habilidade ${reference} está duplicada.`) }
    descriptionByReference.set(reference, description);
  }
  return descriptionByReference;
}

const referencesOf = (question: NewSkillQuestionInput['question']): string[] => {
  const references = question?.newSkillReferences;
  if (references === undefined || references === null) { return [] }
  if (!Array.isArray(references) || !references.every(ref => typeof ref === 'string' && ref.trim() !== '')) {
    throw new HttpError(400, 'newSkillReferences deve ser um array de referências.');
  }
  return [...new Set((references as string[]).map(ref => ref.trim()))];
}

export function planNewSkills<T extends NewSkillQuestionInput>(newSkills: unknown, testQuestions: T[], canLink: (tq: T) => boolean = (tq) => !tq.question?.id): NewSkillsPlan {
  const descriptionByReference = validateNewSkillInputs(newSkills);
  const toCreate = new Map<string, NewSkillPlan>();
  const referenced = new Set<string>();

  for (const tq of testQuestions) {
    if (!canLink(tq)) { continue }
    for (const reference of referencesOf(tq.question)) {
      referenced.add(reference);
      const description = descriptionByReference.get(reference);
      if (description === undefined || toCreate.has(reference)) { continue }
      const classroomCategoryId = Number(tq.question?.classroomCategory?.id);
      if (!Number.isInteger(classroomCategoryId) || classroomCategoryId <= 0) { throw new HttpError(400, 'Todas as questões devem ter categoria definida') }
      toCreate.set(reference, { reference, description, classroomCategoryId });
    }
  }

  return { toCreate: [...toCreate.values()], referenced: [...referenced] };
}

export function newSkillIdsOf(question: { newSkillReferences?: unknown } | undefined, idByReference: Map<string, number>): number[] {
  const references = question?.newSkillReferences;
  if (!Array.isArray(references)) { return [] }
  return references.filter((ref): ref is string => typeof ref === 'string').map(ref => idByReference.get(ref.trim())).filter((id): id is number => id !== undefined);
}
