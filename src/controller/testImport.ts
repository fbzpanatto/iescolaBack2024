import { HttpError } from "../utils/helpers";
import { pdfTextService } from "../services/pdf-text.service";
import { parseAnswerKey, stripAccents } from "../utils/answerKeyParser";
import { testQuestionRepository } from "../repositories/test-question.repository";
import { catalogRepository } from "../repositories/catalog.repository";
import { DOCX_MAGIC, docxToTextItems } from "../utils/docxTextItems";

const PDF_MAGIC = '%PDF-'

class TestImportController {

  async importAnswerKey(body: unknown) {
    try {
      if (!Buffer.isBuffer(body) || body.length === 0) { throw new HttpError(400, 'Envie um arquivo PDF ou DOCX.') }
      const isPdf = body.subarray(0, PDF_MAGIC.length).toString('latin1') === PDF_MAGIC
      if (!isPdf && !body.subarray(0, DOCX_MAGIC.length).equals(DOCX_MAGIC)) { throw new HttpError(400, 'O arquivo enviado não é um PDF ou DOCX válido.') }

      const parsed = parseAnswerKey(isPdf ? await pdfTextService.extractItems(body) : docxToTextItems(body));

      const references = parsed.blocks.flatMap(block => block.questions.flatMap(question => [question.reference, ...question.extraSkills.map(skill => skill.reference)]));
      const [ skills, disciplines ] = await Promise.all([ testQuestionRepository.qSkillsByReferences(references), catalogRepository.qDisciplines() ]);

      const skillIdByReference = new Map(skills.map(skill => [skill.reference, skill.id]));
      const disciplineIdByName = new Map(disciplines.map(discipline => [stripAccents(discipline.name.trim()), discipline.id]));

      const blocks = parsed.blocks.map(block => ({
        disciplineName: block.disciplineName,
        disciplineId: disciplineIdByName.get(stripAccents(block.disciplineName)) ?? null,
        questions: block.questions.map(question => ({
          number: question.number,
          answer: question.answer,
          reference: question.reference,
          description: question.description,
          skillId: skillIdByReference.get(question.reference) ?? null,
          extraSkills: question.extraSkills.map(skill => ({ ...skill, skillId: skillIdByReference.get(skill.reference) ?? null }))
        }))
      }));

      return { status: 200, data: { year: parsed.year, blocks } };
    }
    catch (error: any) {
      if (error instanceof HttpError) { return { status: error.status, message: error.message } }
      console.error(error);
      return { status: 500, message: error.message };
    }
  }
}

export const testImportController = new TestImportController();
