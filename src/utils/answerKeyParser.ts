import { HttpError } from "./helpers";

export interface PdfTextItem { page: number, str: string, x: number, y: number, width: number }
export interface ParsedSkill { reference: string, description: string }
export interface ParsedAnswerKeyQuestion extends ParsedSkill { number: number, answer: 'A' | 'B' | 'C' | 'D', extraSkills: ParsedSkill[] }
export interface ParsedAnswerKeyBlock { disciplineName: string, questions: ParsedAnswerKeyQuestion[] }
export interface ParsedAnswerKey { year: number | null, blocks: ParsedAnswerKeyBlock[] }

interface Row { page: number, y: number, items: PdfTextItem[] }
interface Columns { numberMaxX: number, answerMaxX: number }
interface Line { absY: number, x: number, text: string }
interface Cell { reference: string, extraReferences: string[], firstAbsY: number, lastAbsY: number, parts: string[] }
interface Pair { number: number, answer: string, absY: number }

const ROW_TOLERANCE = 2
const PAIR_TOLERANCE = 8
const COLUMN_MARGIN = 5
const SKILL_X_TOLERANCE = 3
const PAGE_STRIDE = 100000
const REFERENCE_CODE = '[A-Za-z]{1,6}\\d[A-Za-z0-9]{0,24}'
// Aceita "(COD) texto", "COD - texto", "COD- texto", "COD: texto" e vários códigos na mesma célula ("COD1 / COD2: texto").
const REFERENCE_START = new RegExp(`^(?:\\(\\s*(${REFERENCE_CODE})\\s*\\)\\s*(?:[-–—:]\\s*)?|(${REFERENCE_CODE}(?:\\s*/\\s*${REFERENCE_CODE})*)\\s*[-–—:]\\s*)(.*)$`)
const YEAR_PATTERN = /(\d{1,2})\s*[°ºo]\s*ANO/i
const HEADER_WORDS = ['QUESTAO', 'GABARITO', 'HABILIDADE']
const ITEM_HEADER_WORDS = ['ITEM', 'GABARITO']

export const stripAccents = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

const joinItems = (items: PdfTextItem[]): string => {
  let text = ''
  let previousEnd: number | null = null
  for (const item of items) {
    if (previousEnd !== null && item.x - previousEnd > 1) { text += ' ' }
    text += item.str
    previousEnd = item.x + item.width
  }
  return squash(text)
}

const buildRows = (items: PdfTextItem[]): Row[] => {
  const sorted = [...items].sort((a, b) => a.page - b.page || a.y - b.y)
  const rows: Row[] = []
  for (const item of sorted) {
    const last = rows[rows.length - 1]
    if (last && last.page === item.page && Math.abs(item.y - last.y) <= ROW_TOLERANCE) { last.items.push(item); continue }
    rows.push({ page: item.page, y: item.y, items: [item] })
  }
  for (const row of rows) { row.items.sort((a, b) => a.x - b.x) }
  return rows
}

const isHeaderRow = (row: Row): boolean => {
  const words = row.items.map(item => stripAccents(squash(item.str)))
  return HEADER_WORDS.every(word => words.includes(word))
}

const isItemHeaderRow = (row: Row): boolean => {
  const words = row.items.map(item => stripAccents(squash(item.str)))
  return ITEM_HEADER_WORDS.every(word => words.includes(word)) && !words.includes('HABILIDADE')
}

const columnsOf = (header: Row): Columns => {
  const answerHeader = header.items.find(item => stripAccents(squash(item.str)) === 'GABARITO')!
  return { numberMaxX: answerHeader.x, answerMaxX: answerHeader.x + answerHeader.width + COLUMN_MARGIN }
}

const detectYear = (rows: Row[]): number | null => {
  const years = new Set<number>()
  for (const row of rows) {
    const match = YEAR_PATTERN.exec(joinItems(row.items))
    if (match) { years.add(Number(match[1])) }
  }
  if (years.size > 1) { throw new HttpError(400, 'O PDF contém anos diferentes no cabeçalho.') }
  return years.size === 1 ? [...years][0] : null
}

const invalid = (disciplineName: string, detail: string): HttpError => new HttpError(400, `Gabarito inválido em ${disciplineName}: ${detail}`)

const parseTable = (disciplineName: string, rows: Row[], columns: Columns): ParsedAnswerKeyQuestion[] => {
  const lines: Line[] = []
  const pairs: Pair[] = []

  for (const row of rows) {
    const absY = row.page * PAGE_STRIDE + row.y
    const numberText = joinItems(row.items.filter(item => item.x < columns.numberMaxX))
    const answerText = joinItems(row.items.filter(item => item.x >= columns.numberMaxX && item.x < columns.answerMaxX))
    const skillItems = row.items.filter(item => item.x >= columns.answerMaxX)

    if (/^\d{1,3}$/.test(numberText)) {
      if (!/^[A-Da-d]$/.test(answerText)) { throw invalid(disciplineName, `a resposta da questão ${Number(numberText)} deve ser A, B, C ou D.`) }
      pairs.push({ number: Number(numberText), answer: answerText.toUpperCase(), absY })
    } else if (/^[A-Da-d]$/.test(answerText)) {
      throw invalid(disciplineName, `a resposta ${answerText.toUpperCase()} está sem um número de questão válido.`)
    }

    if (skillItems.length > 0) { lines.push({ absY, x: skillItems[0].x, text: joinItems(skillItems) }) }
  }

  if (lines.length === 0) { throw invalid(disciplineName, 'nenhuma habilidade encontrada.') }
  const skillStartX = Math.min(...lines.map(line => line.x))

  const cells: Cell[] = []
  for (const line of lines) {
    const start = line.x <= skillStartX + SKILL_X_TOLERANCE ? REFERENCE_START.exec(line.text) : null
    if (start) {
      const [reference, ...extraReferences] = (start[1] ?? start[2]).split('/').map(code => code.trim())
      cells.push({ reference, extraReferences, firstAbsY: line.absY, lastAbsY: line.absY, parts: [start[3]] })
      continue
    }
    const current = cells[cells.length - 1]
    if (line.x > skillStartX + SKILL_X_TOLERANCE) { continue }
    // Habilidade sem código: a linha divide a linha da tabela com um par e a célula atual já tem o par dela.
    // Sai com reference vazia; o import procura a habilidade pela descrição.
    const ownsPair = pairs.some(pair => pair.absY === line.absY)
    const currentHasPair = !!current && pairs.some(pair => pair.absY >= current.firstAbsY - PAIR_TOLERANCE && pair.absY < line.absY)
    if (ownsPair && (!current || currentHasPair)) {
      cells.push({ reference: '', extraReferences: [], firstAbsY: line.absY, lastAbsY: line.absY, parts: [line.text] })
      continue
    }
    if (!current) { continue }
    current.parts.push(line.text)
    current.lastAbsY = line.absY
  }

  if (cells.length === 0) { throw invalid(disciplineName, 'nenhuma habilidade com código encontrada.') }

  const pairByCell = new Map<Cell, Pair>()
  for (const pair of pairs) {
    const owners = cells.filter(cell => pair.absY >= cell.firstAbsY - PAIR_TOLERANCE && pair.absY <= cell.lastAbsY + PAIR_TOLERANCE)
    if (owners.length !== 1) { throw invalid(disciplineName, `não foi possível associar a questão ${pair.number} a uma habilidade.`) }
    if (pairByCell.has(owners[0])) { throw invalid(disciplineName, `a questão ${pair.number} está sem código de habilidade (o texto deve começar com o código, como "EF09MA14 - ...").`) }
    pairByCell.set(owners[0], pair)
  }

  // Questão com mais de uma habilidade: o número fica centralizado verticalmente na linha mesclada,
  // então só a primeira célula do grupo contém o par; as seguintes (sem par) pertencem a ele.
  const groups: { pair: Pair, cells: Cell[] }[] = []
  for (const cell of cells) {
    const pair = pairByCell.get(cell)
    if (pair) { groups.push({ pair, cells: [cell] }); continue }
    const current = groups[groups.length - 1]
    if (!current) { throw invalid(disciplineName, `a habilidade ${cell.reference} está sem número de questão.`) }
    current.cells.push(cell)
  }

  const seen = new Set<number>()
  return groups.map(({ pair, cells: group }): ParsedAnswerKeyQuestion => {
    if (seen.has(pair.number)) { throw invalid(disciplineName, `a questão ${pair.number} está duplicada.`) }
    seen.add(pair.number)
    if (group.length > 1) {
      const center = (group[0].firstAbsY + group[group.length - 1].lastAbsY) / 2
      if (Math.abs(center - pair.absY) > PAIR_TOLERANCE) { throw invalid(disciplineName, `não foi possível associar a questão ${pair.number} às suas habilidades.`) }
    }
    const skills = group.flatMap(cell => [cell.reference, ...cell.extraReferences].map(reference => ({ reference, description: squash(cell.parts.join(' ')) })))
    const emptyDescription = skills.find(skill => !skill.description)
    if (emptyDescription) { throw invalid(disciplineName, `a habilidade ${emptyDescription.reference} está sem descrição.`) }
    const [primary, ...extraSkills] = skills
    return { number: pair.number, answer: pair.answer as ParsedAnswerKeyQuestion['answer'], ...primary, extraSkills }
  })
}

// Modelo sem habilidades: tabela "Item | Gabarito" repetida lado a lado. Cada linha traz pares número/letra em sequência;
// a questão sai com reference vazia (sem habilidade), o mesmo contrato do modelo com habilidades.
const parseItemTable = (disciplineName: string, rows: Row[]): ParsedAnswerKeyQuestion[] => {
  const questions: ParsedAnswerKeyQuestion[] = []
  const seen = new Set<number>()
  for (const row of rows) {
    const tokens = row.items.map(item => squash(item.str)).filter(Boolean)
    if (tokens.length % 2 !== 0) { throw invalid(disciplineName, `a linha "${tokens.join(' ')}" não tem pares de item e gabarito.`) }
    for (let index = 0; index < tokens.length; index += 2) {
      const [numberText, answerText] = [tokens[index], tokens[index + 1]]
      if (!/^\d{1,3}$/.test(numberText)) { throw invalid(disciplineName, `"${numberText}" não é um número de item válido.`) }
      if (!/^[A-Da-d]$/.test(answerText)) { throw invalid(disciplineName, `a resposta do item ${Number(numberText)} deve ser A, B, C ou D.`) }
      const number = Number(numberText)
      if (seen.has(number)) { throw invalid(disciplineName, `o item ${number} está duplicado.`) }
      seen.add(number)
      questions.push({ number, answer: answerText.toUpperCase() as ParsedAnswerKeyQuestion['answer'], reference: '', description: '', extraSkills: [] })
    }
  }
  if (questions.length === 0) { throw invalid(disciplineName, 'nenhum item encontrado.') }
  return questions.sort((a, b) => a.number - b.number)
}

export function parseAnswerKey(items: PdfTextItem[]): ParsedAnswerKey {
  const rows = buildRows(items)
  const headerIndexes = rows.map((row, index) => isHeaderRow(row) || isItemHeaderRow(row) ? index : -1).filter(index => index >= 0)
  if (headerIndexes.length === 0) { throw new HttpError(400, 'Não foi possível encontrar a tabela de gabarito no PDF.') }

  const year = detectYear(rows.slice(0, headerIndexes[0]))

  const blocks = headerIndexes.map((headerIndex, position): ParsedAnswerKeyBlock => {
    const titleRow = rows[headerIndex - 1]
    if (!titleRow || (position > 0 && headerIndex - 1 <= headerIndexes[position - 1])) {
      throw new HttpError(400, 'Não foi possível identificar a disciplina de uma tabela do gabarito.')
    }
    const disciplineName = joinItems(titleRow.items)
    const nextHeader = headerIndexes[position + 1]
    const end = nextHeader === undefined ? rows.length : nextHeader - 1
    const body = rows.slice(headerIndex + 1, end)
    const questions = isItemHeaderRow(rows[headerIndex]) ? parseItemTable(disciplineName, body) : parseTable(disciplineName, body, columnsOf(rows[headerIndex]))
    return { disciplineName, questions }
  })

  return { year, blocks }
}
