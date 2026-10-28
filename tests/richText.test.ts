import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { isRichTitle, RICH_TITLE_MAX_LENGTH, sanitizeRichTitle, stripControlChars } from '../src/utils/richText'

describe('isRichTitle', () => {
  test('detects block-level start, with leading whitespace', () => {
    assert.equal(isRichTitle('<p>texto</p>'), true)
    assert.equal(isRichTitle('  \n<ul><li>a</li></ul>'), true)
    assert.equal(isRichTitle('<p class="rt-center">x</p>'), true)
  })

  test('treats plain text and other tags as not rich', () => {
    assert.equal(isRichTitle('quanto é 2 < 3?'), false)
    assert.equal(isRichTitle('<script>alert(1)</script>'), false)
    assert.equal(isRichTitle('<pre>x</pre>'), false)
    assert.equal(isRichTitle('texto <p>'), false)
  })
})

describe('sanitizeRichTitle', () => {
  test('keeps allowed markup and canonicalizes it', () => {
    const html = '<p class="rt-center rt-indent-2">Olá <strong>mundo</strong><br/><em>x</em><u>y</u></p><ul><li>a</li><li class="rt-justify">b</li></ul>'
    assert.equal(
      sanitizeRichTitle(html),
      '<p class="rt-center rt-indent-2">Olá <strong>mundo</strong><br><em>x</em><u>y</u></p><ul><li>a</li><li class="rt-justify">b</li></ul>'
    )
  })

  test('is idempotent', () => {
    const once = sanitizeRichTitle('<p>a &amp; b &lt;c&gt; <script>x</script> 1 < 2 & 3</p>') as string
    assert.equal(sanitizeRichTitle(once), once)
  })

  const attacks: Array<[string, string]> = [
    ['script tag', '<p>a</p><script>alert(1)</script>'],
    ['img onerror', '<p><img src=x onerror=alert(1)></p>'],
    ['svg onload', '<p><svg onload=alert(1)></svg></p>'],
    ['anchor javascript', '<p><a href="javascript:alert(1)">x</a></p>'],
    ['iframe', '<p><iframe src="//evil"></iframe></p>'],
    ['event handler on allowed tag', '<p onclick="alert(1)">x</p>'],
    ['style attribute', '<p style="background:url(javascript:alert(1))">x</p>'],
    ['class outside allowlist', '<p class="evil">x</p>'],
    ['class with injected attribute', '<p class="rt-center" onclick="x">y</p>'],
    ['quote break in class', '<p class="rt-center"onclick=alert(1) x="">y</p>'],
    ['uppercase tags', '<P>x</P><SCRIPT>alert(1)</SCRIPT>'],
    ['nested comment', '<p><!--><img src=x onerror=alert(1)>--></p>'],
    ['entity smuggling', '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'],
    ['null byte', '<p><scr\u0000ipt>alert(1)</scr\u0000ipt></p>']
  ]

  for (const [name, payload] of attacks) {
    test(`neutralizes ${name}`, () => {
      const clean = sanitizeRichTitle(payload)
      if (clean === null) { return }
      const tags = clean.match(/<[^>]*>/g) ?? []
      for (const tag of tags) {
        assert.match(tag, /^<\/?(?:p|br|strong|em|u|ul|ol|li)(?: class="(?:rt-(?:center|right|justify|indent-[1-4])(?: |(?="))?)+")?>$/)
      }
      assert.ok(!/<(?!\/?(?:p|br|strong|em|u|ul|ol|li)[ >])/i.test(clean), clean)
    })
  }

  test('escapes disallowed tags into inert text', () => {
    assert.equal(sanitizeRichTitle('<p><b>x</b></p>'), '<p>&lt;b&gt;x&lt;/b&gt;</p>')
    assert.equal(sanitizeRichTitle('<p>a < b > c & d</p>'), '<p>a &lt; b &gt; c &amp; d</p>')
  })

  test('rejects unbalanced or misnested structure', () => {
    assert.equal(sanitizeRichTitle('<p>a'), null)
    assert.equal(sanitizeRichTitle('<p>a</p></p>'), null)
    assert.equal(sanitizeRichTitle('<p><strong>a</p></strong>'), null)
    assert.equal(sanitizeRichTitle('<p><p>a</p></p>'), null)
    assert.equal(sanitizeRichTitle('<ul><p>a</p></ul>'), null)
    assert.equal(sanitizeRichTitle('<li>a</li>'), null)
  })

  test('rejects excessive nesting', () => {
    const deep = '<ul><li>'.repeat(5) + 'x' + '</li></ul>'.repeat(5)
    assert.equal(sanitizeRichTitle(deep), null)
  })

  test('strips control and bidi override characters', () => {
    assert.equal(sanitizeRichTitle('<p>a\u0000b‮c</p>'), '<p>abc</p>')
  })

  test('output length is measurable against the title limit', () => {
    const body = 'a'.repeat(RICH_TITLE_MAX_LENGTH - 7)
    const clean = sanitizeRichTitle(`<p>${body}</p>`) as string
    assert.equal(clean.length, RICH_TITLE_MAX_LENGTH)
  })
})

describe('stripControlChars', () => {
  test('removes control characters but keeps text, newline and tab', () => {
    assert.equal(stripControlChars('a\u0000b\u0007c'), 'abc')
    assert.equal(stripControlChars('a\tb\nc'), 'a\tb\nc')
  })
})
