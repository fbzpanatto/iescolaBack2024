export const RICH_TITLE_MAX_LENGTH = 5000

const RICH_START = /^\s*<(?:p|ul|ol)[\s>]/
const TAG = /<(\/?)(p|br|strong|em|u|ul|ol|li)(?:\s+class="([^"<>&]*)")?\s*(\/?)>/y
const ENTITY = /&(?:amp|lt|gt|quot|#39|nbsp);/y
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g

const ALIGN_CLASSES: ReadonlySet<string> = new Set(['rt-center', 'rt-right', 'rt-justify'])
const INDENT_CLASSES: ReadonlySet<string> = new Set(['rt-indent-1', 'rt-indent-2', 'rt-indent-3', 'rt-indent-4'])
const CLASSED_TAGS: ReadonlySet<string> = new Set(['p', 'li'])
const INLINE_TAGS: ReadonlySet<string> = new Set(['strong', 'em', 'u'])
const MAX_DEPTH = 8

type Parent = 'root' | 'p' | 'ul' | 'ol' | 'li' | 'strong' | 'em' | 'u'

export function isRichTitle(value: string): boolean {
  return RICH_START.test(value)
}

function canonicalClasses(raw: string | undefined): string | null {
  if (raw === undefined) { return '' }
  const tokens = raw.split(/\s+/).filter(Boolean)
  const align = tokens.filter(t => ALIGN_CLASSES.has(t))
  const indent = tokens.filter(t => INDENT_CLASSES.has(t))
  if (align.length + indent.length !== tokens.length || align.length > 1 || indent.length > 1) { return null }
  const classes = [...align, ...indent]
  return classes.length ? ` class="${classes.join(' ')}"` : ''
}

function parentAllows(tag: string, parent: Parent): boolean {
  switch (tag) {
    case 'p':
    case 'ul':
    case 'ol': return parent === 'root' || parent === 'li'
    case 'li': return parent === 'ul' || parent === 'ol'
    case 'br': return parent !== 'ul' && parent !== 'ol'
    default: return INLINE_TAGS.has(tag) && parent !== 'ul' && parent !== 'ol'
  }
}

export function sanitizeRichTitle(input: string): string | null {
  const source = input.replace(CONTROL_CHARS, '').trim()
  const stack: Parent[] = []
  let out = ''
  let i = 0

  while (i < source.length) {
    const char = source[i]

    if (char === '<') {
      TAG.lastIndex = i
      const match = TAG.exec(source)
      if (match) {
        const [whole, closing, tag, rawClass, selfClose] = match
        const parent: Parent = stack[stack.length - 1] ?? 'root'

        if (closing) {
          if (rawClass !== undefined || selfClose || tag === 'br' || stack.pop() !== tag) { return null }
          out += `</${tag}>`
          i += whole.length
          continue
        }

        const classes = CLASSED_TAGS.has(tag) ? canonicalClasses(rawClass) : (rawClass === undefined ? '' : null)
        if (classes !== null && (selfClose === '' || tag === 'br') && parentAllows(tag, parent)) {
          if (tag === 'br') { out += '<br>' }
          else {
            if (stack.length >= MAX_DEPTH) { return null }
            stack.push(tag as Parent)
            out += `<${tag}${classes}>`
          }
          i += whole.length
          continue
        }
      }
      out += '&lt;'
      i += 1
      continue
    }

    if (char === '>') { out += '&gt;'; i += 1; continue }

    if (char === '&') {
      ENTITY.lastIndex = i
      const entity = ENTITY.exec(source)
      if (entity) { out += entity[0]; i += entity[0].length; continue }
      out += '&amp;'
      i += 1
      continue
    }

    out += char
    i += 1
  }

  return stack.length ? null : out
}

export function stripControlChars(input: string): string {
  return input.replace(CONTROL_CHARS, '')
}
