import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAnswerKey, PdfTextItem } from '../src/utils/answerKeyParser'
import { HttpError } from '../src/utils/helpers'

const loadItems = (year: number): PdfTextItem[] => JSON.parse(readFileSync(join(__dirname, 'answer-key', `items-${year}.json`), 'utf8'))

const rejects400 = (items: PdfTextItem[], pattern: RegExp): void => {
  assert.throws(() => parseAnswerKey(items), (error: unknown) => error instanceof HttpError && error.status === 400 && pattern.test(error.message))
}

describe('parseAnswerKey with the real sample files', () => {
  for (const year of [6, 7, 8, 9]) {
    test(`${year}o ano has 3 disciplines with 6 numbered questions each`, () => {
      const result = parseAnswerKey(loadItems(year))
      assert.equal(result.year, year)
      assert.deepEqual(result.blocks.map(block => block.disciplineName), ['GEOGRAFIA', 'HISTÓRIA', 'CIÊNCIAS'])
      for (const block of result.blocks) {
        assert.deepEqual(block.questions.map(question => question.number), [1, 2, 3, 4, 5, 6])
        for (const question of block.questions) {
          assert.match(question.answer, /^[A-D]$/)
          assert.ok(question.reference.length > 0 && question.description.length > 0)
        }
      }
    })
  }

  test('7o ano answers, the typo reference and the multi-line descriptions', () => {
    const [geo, history, science] = parseAnswerKey(loadItems(7)).blocks
    assert.deepEqual(geo.questions.map(q => q.answer), ['B', 'A', 'D', 'A', 'C', 'D'])
    assert.equal(history.questions[4].reference, 'F07HI13A')
    assert.equal(history.questions[4].description, 'Caracterizar a ação dos europeus e suas lógicas mercantis visando ao domínio no mundo atlântico (colonização portuguesa).')
    assert.deepEqual(science.questions.map(q => q.answer), ['B', 'A', 'C', 'B', 'A', 'D'])
    assert.equal(geo.questions[2].reference, 'EF07GE06')
    assert.equal(geo.questions[2].description, 'Discutir em que medida a produção, a circulação e o consumo de mercadorias provocam impactos ambientais, assim como influem na distribuição de riquezas, em diferentes lugares.')
  })

  test('a parenthesis inside the description does not start a new skill', () => {
    const science = parseAnswerKey(loadItems(7)).blocks[2]
    assert.equal(science.questions[4].reference, 'EF07CICM21')
    assert.match(science.questions[4].description, /cotidianos \(garrafas e caixas térmicas\) considerando/)
  })

  test('a skill cell that continues on the next page keeps its whole description', () => {
    const history = parseAnswerKey(loadItems(7)).blocks[1]
    assert.equal(history.questions[3].number, 4)
    assert.match(history.questions[3].description, /formas de resistência \(América portuguesa e espanhola\)\.$/)
  })

  test('accepts references without the dash (6o) and without parentheses (9o)', () => {
    const history6 = parseAnswerKey(loadItems(6)).blocks[1]
    assert.equal(history6.questions[0].reference, 'EF06HI10')
    assert.match(history6.questions[0].description, /^Explicar a formação da Grécia Antiga/)
    const science9 = parseAnswerKey(loadItems(9)).blocks[2]
    assert.equal(science9.questions[0].reference, 'EF09CICM09')
  })

  test('a question with two skills keeps the first as primary and lists the rest', () => {
    const science9 = parseAnswerKey(loadItems(9)).blocks[2]
    assert.equal(science9.questions[2].reference, 'EF09CICM12')
    assert.deepEqual(science9.questions[2].extraSkills.map(skill => skill.reference), ['EF09CICM11'])
    assert.deepEqual(science9.questions[3].extraSkills.map(skill => skill.reference), ['EF09CICM11'])
    assert.deepEqual(science9.questions[0].extraSkills, [])
  })
})

describe('parseAnswerKey rejections', () => {
  test('rejects an answer that is not A-D', () => {
    const items = loadItems(7)
    items.find(item => item.str === 'B' && item.page === 1)!.str = 'E'
    rejects400(items, /GEOGRAFIA.*questão 1.*A, B, C ou D/)
  })

  test('rejects an answer without a valid question number', () => {
    const items = loadItems(7)
    items.find(item => item.str === '2' && item.page === 1)!.str = 'x'
    rejects400(items, /GEOGRAFIA.*sem um número de questão válido/)
  })

  test('rejects a duplicated question number', () => {
    const items = loadItems(7)
    items.find(item => item.str === '2' && item.page === 1)!.str = '1'
    rejects400(items, /GEOGRAFIA.*duplicada/)
  })

  test('rejects a skill without a question number', () => {
    const items = loadItems(7)
    const index = items.findIndex(item => item.str === '6' && item.page === 1)
    items.splice(index, 2)
    rejects400(items, /GEOGRAFIA.*questão 5.*suas habilidades/)
  })

  test('rejects conflicting years in the header', () => {
    const items = loadItems(7)
    items.push({ page: 1, str: '8° ANO', x: 269.3, y: 120, width: 46.1 })
    rejects400(items, /anos diferentes/)
  })

  test('rejects a document without the answer table', () => {
    rejects400([{ page: 1, str: 'Texto qualquer', x: 10, y: 10, width: 50 }], /tabela de gabarito/)
    rejects400([], /tabela de gabarito/)
  })

  test('year is null when the header has no grade', () => {
    const items = loadItems(7).filter(item => item.str !== '7° ANO')
    assert.equal(parseAnswerKey(items).year, null)
  })
})
