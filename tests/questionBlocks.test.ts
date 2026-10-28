import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { prepareQuestionBlocks, MAX_QUESTION_BLOCKS } from '../src/utils/questionBlocks'
import { testQuestionService } from '../src/services/test-question.service'

const thrown = (fn: () => unknown): { status: number } => {
  try { fn() } catch (e) { return e as { status: number } }
  throw new Error('expected throw')
}

describe('prepareQuestionBlocks', () => {
  test('returns null when blocks are not sent', () => {
    assert.equal(prepareQuestionBlocks(undefined), null)
    assert.equal(prepareQuestionBlocks(null), null)
  })

  test('assigns sequential order and sanitizes text', () => {
    const result = prepareQuestionBlocks([
      { type: 'text', content: '<p>a <script>x</script><strong>b</strong></p>' },
      { id: 7, type: 'image', s3Key: 'questions/a.png', caption: '  Gráfico   I  ' },
      { type: 'image', s3Key: 'tmp/b.png', caption: '   ' }
    ])
    assert.ok(result)
    assert.deepEqual(result.map(b => b.order), [1, 2, 3])
    assert.equal(result[0].content?.includes('script>'), false)
    assert.equal(result[1].id, 7)
    assert.equal(result[1].caption, 'Gráfico I')
    assert.equal(result[2].caption, null)
  })

  test('rejects invalid shapes', () => {
    assert.equal(thrown(() => prepareQuestionBlocks('x')).status, 400)
    assert.equal(thrown(() => prepareQuestionBlocks([null])).status, 400)
    assert.equal(thrown(() => prepareQuestionBlocks([{ type: 'video' }])).status, 400)
    assert.equal(thrown(() => prepareQuestionBlocks([{ type: 'text', content: 'plain' }])).status, 400)
    assert.equal(thrown(() => prepareQuestionBlocks([{ type: 'image', s3Key: '../etc/passwd' }])).status, 400)
    assert.equal(thrown(() => prepareQuestionBlocks([{ type: 'image', s3Key: 'tmp/a.png', caption: 'x'.repeat(301) }])).status, 400)
    assert.equal(thrown(() => prepareQuestionBlocks([{ id: 1.5, type: 'image', s3Key: 'tmp/a.png' }])).status, 400)
  })

  test('limits the number of blocks and the text size', () => {
    const many = Array.from({ length: MAX_QUESTION_BLOCKS + 1 }, () => ({ type: 'text', content: '<p>a</p>' }))
    assert.equal(thrown(() => prepareQuestionBlocks(many)).status, 400)
    assert.equal(prepareQuestionBlocks(many.slice(0, MAX_QUESTION_BLOCKS))?.length, MAX_QUESTION_BLOCKS)
    assert.equal(thrown(() => prepareQuestionBlocks([{ type: 'text', content: `<p>${'a'.repeat(5000)}</p>` }])).status, 400)
  })
})

describe('prepareNewQuestion upload keys', () => {
  const newQuestion = (question: object) => ({ answer: '', question: { title: 'Q', ...question } })

  test('accepts tmp/ keys on a new question', () => {
    const prepared = testQuestionService.prepareNewQuestion(newQuestion({
      images: [{ type: 'main', order: 1, s3Key: 'tmp/a.png' }],
      blocks: [{ type: 'image', s3Key: 'tmp/b.png', caption: 'Figura' }],
    }))
    assert.equal(prepared?.blocks[0].s3Key, 'tmp/b.png')
  })

  test('rejects keys already in questions/ on a new question', () => {
    assert.equal(thrown(() => testQuestionService.prepareNewQuestion(newQuestion({ blocks: [{ type: 'image', s3Key: 'questions/b.png' }] }))).status, 400)
    assert.equal(thrown(() => testQuestionService.prepareNewQuestion(newQuestion({ images: [{ type: 'main', order: 1, s3Key: 'questions/a.png' }] }))).status, 400)
  })

  test('skips the check for a reused question', () => {
    assert.equal(testQuestionService.prepareNewQuestion(newQuestion({ id: 7, blocks: [{ type: 'image', s3Key: 'questions/b.png' }] })), null)
  })
})

describe('assertAddedImageKeys', () => {
  test('only checks images without id', () => {
    assert.doesNotThrow(() => testQuestionService.assertAddedImageKeys([{ id: 3, s3Key: 'questions/a.png' }, { s3Key: 'tmp/b.png' }]))
    assert.doesNotThrow(() => testQuestionService.assertAddedImageKeys(undefined))
    assert.equal(thrown(() => testQuestionService.assertAddedImageKeys([{ s3Key: 'questions/a.png' }])).status, 400)
  })
})
