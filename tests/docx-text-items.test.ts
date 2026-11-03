import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { docxToTextItems } from '../src/utils/docxTextItems'
import { parseAnswerKey } from '../src/utils/answerKeyParser'

const zipOf = (name: string, content: string): Buffer => {
  const data = deflateRawSync(Buffer.from(content, 'utf8'))
  const fileName = Buffer.from(name)
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt16LE(fileName.length, 26)
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(data.length, 20); central.writeUInt16LE(fileName.length, 28)
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 10); end.writeUInt32LE(46 + fileName.length, 12); end.writeUInt32LE(30 + fileName.length + data.length, 16)
  return Buffer.concat([local, fileName, data, central, fileName, end])
}

const cell = (text: string) => `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`
const row = (...cells: string[]) => `<w:tr>${cells.join('')}</w:tr>`
const doc = (...parts: string[]) => `<w:document><w:body>${parts.join('')}</w:body></w:document>`
const header = row(cell('QUESTÃO'), cell('GABARITO'), cell('HABILIDADE'))

describe('docxToTextItems', () => {
  test('feeds the answer key parser, decoding entities and joining wrapped paragraphs', () => {
    const xml = doc('<w:p><w:r><w:t>7° ANO</w:t></w:r></w:p>', '<w:p><w:r><w:t>MATEMÁTICA</w:t></w:r></w:p>', header,
      row(cell('1'), cell('b'), '<w:tc><w:p><w:r><w:t>(EF07MA01) - Comparar &amp; ordenar</w:t></w:r></w:p><w:p><w:r><w:t>números.</w:t></w:r></w:p></w:tc>'))
    const parsed = parseAnswerKey(docxToTextItems(zipOf('word/document.xml', xml)))
    assert.equal(parsed.year, 7)
    assert.equal(parsed.blocks[0].disciplineName, 'MATEMÁTICA')
    assert.deepEqual(parsed.blocks[0].questions.map(q => [q.number, q.answer, q.reference, q.description]), [[1, 'B', 'EF07MA01', 'Comparar & ordenar números.']])
  })

  test('keeps a question with two skills in one cell as its extra skill', () => {
    const skills = '<w:tc><w:p><w:r><w:t>(EF08CI01) - Primeira</w:t></w:r></w:p><w:p><w:r><w:t>EF08CI02 - Segunda</w:t></w:r></w:p></w:tc>'
    const xml = doc('<w:p><w:r><w:t>8° ANO</w:t></w:r></w:p>', '<w:p><w:r><w:t>CIÊNCIAS</w:t></w:r></w:p>', header,
      row(cell('1'), cell('C'), skills), row(cell('2'), cell('A'), cell('(EF08CI04) - Quarta')))
    const questions = parseAnswerKey(docxToTextItems(zipOf('word/document.xml', xml))).blocks[0].questions
    assert.deepEqual(questions.map(q => [q.number, q.reference, q.extraSkills.map(s => s.reference)]), [[1, 'EF08CI01', ['EF08CI02']], [2, 'EF08CI04', []]])
  })

  test('rejects vertically merged cells with a clear message', () => {
    const merged = '<w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc>'
    const xml = doc(header, row(merged, cell('C'), cell('(EF08CI01) - Primeira')))
    assert.throws(() => docxToTextItems(zipOf('word/document.xml', xml)), /células mescladas na vertical/)
  })

  test('rejects a zip without word/document.xml', () => {
    assert.throws(() => docxToTextItems(zipOf('other.xml', '<a/>')), /documento do Word/)
  })
})
