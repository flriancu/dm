import { describe, it, expect } from 'vitest'
import { parseFrontMatter, splitSections, slug } from './frontmatter'

describe('parseFrontMatter', () => {
  it('parses scalars, lists, booleans and leaves the body', () => {
    const { meta, body } = parseFrontMatter('---\nid: 01\norder: 1\ntitle: Visează din nou\nsources: [a, b c, d]\nreconstructed: true\n---\n# Hello\n')
    expect(meta).toEqual({ id: 1, order: 1, title: 'Visează din nou', sources: ['a', 'b c', 'd'], reconstructed: true })
    expect(body).toBe('# Hello\n')
  })
  it('keeps colons inside values and handles CRLF', () => {
    const { meta } = parseFrontMatter('---\r\ntitle: Ora: 10:30\r\nduration: "1,5–2 ore"\r\n---\r\nx')
    expect(meta.title).toBe('Ora: 10:30')
    expect(meta.duration).toBe('1,5–2 ore')
  })
  it('returns the whole text as body when there is no front matter', () => {
    const { meta, body } = parseFrontMatter('just text')
    expect(meta).toEqual({}); expect(body).toBe('just text')
  })
  it('reads 01 as the number 1 (callers must normalise ids)', () => {
    expect(parseFrontMatter('---\nid: 01\n---\n').meta.id).toBe(1)
  })
})

describe('splitSections', () => {
  const body = '## Învață {#learn}\nA\n## Fă {#do}\nB\n### Sub {#sub}\nC\n## Cu Prietenul Visului {#friend}\nintro\n### Solo {#solo}\ns\n### Pair {#pair}\np\n'
  it('splits by H2 with ids and nests H3', () => {
    const s = splitSections(body)
    expect(s.map((x) => x.id)).toEqual(['learn', 'do', 'friend'])
    expect(s[0].body).toBe('A')
    expect(s[1].body).toBe('B')
    expect(s[1].sub.map((x) => x.id)).toEqual(['sub'])
    expect(s[2].body).toBe('intro')
    expect(s[2].sub.map((x) => [x.id, x.body])).toEqual([['solo', 's'], ['pair', 'p']])
  })
  it('slugs headings without an explicit id', () => {
    expect(splitSections('## Până data viitoare\nx')[0].id).toBe('pana-data-viitoare')
    expect(slug('Ș ț Ă â Î')).toBe('s-t-a-a-i')
  })
  it('returns an empty list for text without headings', () => {
    expect(splitSections('no headings here')).toEqual([])
  })
})
