import type { BackupTables } from '../db/schema'
import type { Settings } from '../db/db'
import {
  CLARIFY_STEPS,
  WOOP_STEPS,
  HABIT_PARTS,
  QUADRANTS,
  WHEEL_AREAS,
  SWLS_ITEMS,
  VISION_SECTIONS,
  REGRET_AREAS,
  LETGO_SIGNS,
} from '../db/db'
import type { T } from '../i18n'
import { letterState } from './course'

/**
 * "My book": everything the learner wrote, as one Markdown document a person can read
 * without the app (opens in any notes app or text editor). The labels are the app's own,
 * in the interface language. A sealed letter stays sealed: only its date is written. The
 * Dream Friend's notes are not part of it (FR-61).
 */
export interface BookInput {
  data: Partial<BackupTables>
  settings: Settings
  t: T
  fmtDate: (d: string) => string
  today: string
}

/** Characters that can start Markdown inside a line: code, emphasis, links, HTML, entities, tables, strike-through. */
const INLINE_MARKUP = /[\\`*_[\]<>&|~]/g
/**
 * Web addresses. A viewer that links a bare address (GFM) takes it up to the next space or
 * `<`, backslashes included: escaping inside it would show in the link and break it, and an
 * escaped `\<` right after it would turn back into HTML. So an address with a scheme is
 * written as an autolink, `<https://…>`, which every viewer shows exactly as typed, links,
 * and reads no markup in; punctuation that ends a sentence stays outside it. A bare `www.`
 * gets its dot escaped instead: no viewer starts a link there, and it reads the same.
 */
const WEB_ADDRESS = /(?:https?|ftp):\/\/[^\s<>]*/gi
const BARE_WWW = /www\./gi
const SENTENCE_END = /[.,:;!?'"*_~]+$/

/** The address as an autolink, and what follows it in the sentence. */
function autolink(address: string): [string, string] {
  let end = address.length - (address.match(SENTENCE_END)?.[0].length ?? 0)
  // a closing parenthesis belongs to the address only when it opened one: "(see https://x.ro/a)"
  while (address[end - 1] === ')' && address.slice(0, end).split(')').length > address.slice(0, end).split('(').length)
    end--
  return [`<${address.slice(0, end)}>`, address.slice(end)]
}

const escapeText = (s: string) => s.replace(INLINE_MARKUP, '\\$&').replace(BARE_WWW, (w) => `${w.slice(0, 3)}\\.`)

function escapeInline(s: string): string {
  let out = ''
  let at = 0
  for (const m of s.matchAll(WEB_ADDRESS)) {
    const [link, after] = autolink(m[0])
    out += escapeText(s.slice(at, m.index)) + link + escapeText(after)
    at = m.index + m[0].length
  }
  return out + escapeText(s.slice(at))
}

/**
 * One line of user text made inert: it reads back exactly as written in any Markdown viewer
 * (it never becomes a heading, list, quote, rule, setext underline, table, code, link, HTML,
 * an entity or emphasis) and stays readable as plain text. CommonMark lets any ASCII
 * punctuation be escaped with a backslash, so every character that can start markup inline is
 * escaped, and so is a block marker at the start (`1.` becomes `1\.`, not `\1.`). Leading
 * indentation is dropped: four spaces would start a code block.
 */
export function escapeLine(line: string): string {
  return escapeInline(line.trim())
    .replace(/^(\d+)([.)])/, '$1\\$2')
    .replace(/^[#=+-]/, '\\$&')
}

/**
 * User text as Markdown: each line escaped, line breaks kept as hard breaks (continued at
 * `indent` inside a list item). Blank lines inside a field are left out: one would end the
 * list item or paragraph the text belongs to.
 */
export function text(s: string | undefined, indent = ''): string {
  if (!s) return ''
  return s.replace(/\r\n?/g, '\n').split('\n').map(escapeLine).filter(Boolean).join(`  \n${indent}`)
}

/** User text on one line (a heading): line breaks become spaces. */
const inline = (s: string) => text(s.replace(/\s*[\r\n]+\s*/g, ' '))

const has = (s: string | undefined) => !!s && s.trim() !== ''

export function bookMarkdown({ data, settings, t, fmtDate, today }: BookInput): string {
  const out: string[] = []
  const h = (level: number, title: string) => out.push('', `${'#'.repeat(level)} ${title}`, '')
  const field = (label: string, value: string | undefined) => {
    if (has(value)) out.push(`- **${label}:** ${text(value, '  ')}`)
  }
  const para = (s: string | undefined) => {
    if (has(s)) out.push(text(s), '')
  }

  out.push(`# ${t('book.md.title')}`, '', t('book.md.saved', { date: fmtDate(today) }))

  // ---- the dream list (module 1–2)
  const dreams = data.dreams ?? []
  if (settings.paperMode) {
    h(2, t('dreams.title'))
    out.push(t('book.md.paper', { n: settings.paperCount }))
  }
  if (dreams.length && !settings.paperMode) {
    h(2, t('dreams.title'))
    dreams.forEach((d, i) => {
      const meta = [
        d.score ? `${d.score}/10` : '',
        d.area ? t(`area.${d.area}`) : '',
        d.why ? t(`dreams.tag.${d.why}`) : '',
        d.dateAchieved ? t('dreams.achieved.on', { date: fmtDate(d.dateAchieved) }) : '',
        d.dateReleased ? t('dreams.released', { date: fmtDate(d.dateReleased) }) : '',
      ].filter(Boolean)
      out.push(`${i + 1}. ${d.chosen ? '★ ' : ''}${text(d.text, '   ')}${meta.length ? ` (${meta.join(', ')})` : ''}`)
    })
  }
  if (settings.criteria.length) {
    out.push('', `**${t('dreams.criteria')}:** ${settings.criteria.map((c) => text(c)).join('; ')}`)
  }

  // ---- the worksheets (modules 2–4, letting go): the chosen dream first, then every dream
  // worked on before (released or achieved), so nothing written disappears from the book
  const works = new Map((data.dreamWork ?? []).map((w) => [w.dreamId, w]))
  const worked = dreams
    .filter((d) => d.chosen || works.has(d.id!))
    .sort((a, b) => (b.chosen ?? 0) - (a.chosen ?? 0) || (a.id ?? 0) - (b.id ?? 0))
  for (const d of worked) {
    const work = works.get(d.id!)
    const before = out.length
    if (d.chosen) {
      h(2, t('home.chosen'))
      para(d.text)
    } else h(2, t('book.md.worksheetsOf', { dream: inline(d.text) }))
    const headed = out.length
    if (work) {
      if (CLARIFY_STEPS.some((s) => has(work.clarify?.[s])) || work.routes?.some(has)) {
        h(3, t('mydream.section.clarify'))
        for (const s of CLARIFY_STEPS) field(t(`clarify.${s}`), work.clarify?.[s])
        work.routes?.forEach((r, i) => field(t('mydream.route', { n: i + 1 }), r))
      }
      if (WOOP_STEPS.some((s) => has(work.woop?.[s]))) {
        h(3, t('woop.title'))
        for (const s of WOOP_STEPS) field(t(`woop.${s}`), work.woop?.[s])
      }
      const log = work.habitLog ?? []
      if (HABIT_PARTS.some((p) => has(work.habit?.[p])) || log.length) {
        h(3, t('habit.title'))
        for (const p of HABIT_PARTS) field(t(`habit.${p}`), work.habit?.[p])
        if (log.length) {
          out.push('', t('book.md.habitWeeks', { n: log.filter((w) => w.done).length, m: log.length }))
          for (const w of [...log].sort((a, b) => a.week.localeCompare(b.week)))
            if (has(w.note)) out.push(`- ${fmtDate(w.week)}${w.done ? ' ✓' : ''}: ${text(w.note, '  ')}`)
        }
      }
      const friends = (work.friends ?? []).filter((f) => has(f.name))
      if (friends.length) {
        h(3, t('friends.title'))
        for (const f of friends) {
          const role = f.role ? ` (${t(`friends.role.${f.role}`)})` : ''
          out.push(`- **${text(f.name)}**${role}${has(f.day) ? `, ${text(f.day)}` : ''}`)
          if (has(f.ask)) out.push(`  ${t('friends.ask')}: ${text(f.ask, '  ')}`)
        }
      }
      if (has(work.fear?.fear) || has(work.fear?.goodEnough)) {
        h(3, t('fear.title'))
        field(t('fear.fear'), work.fear?.fear)
        field(t('fear.goodEnough'), work.fear?.goodEnough)
      }
      const lg = work.letgo
      if (lg && (lg.signs?.length || has(lg.costs) || has(lg.benefits) || has(lg.replacement) || lg.decision)) {
        h(3, t('letgo.title'))
        for (const s of LETGO_SIGNS) if (lg.signs?.includes(s)) out.push(`- ☑ ${t(`letgo.sign.${s}`)}`)
        field(t('letgo.costs'), lg.costs)
        field(t('letgo.benefits'), lg.benefits)
        field(t('letgo.replacement'), lg.replacement)
        if (lg.decision) out.push(`- **${t(`letgo.${lg.decision}`)}**${lg.decided ? `, ${fmtDate(lg.decided)}` : ''}`)
      }
    }
    if (!d.chosen && out.length === headed) out.length = before // an earlier dream with nothing written: no heading
  }

  // ---- the week (module 3)
  const tasks = data.weekTasks ?? []
  if (tasks.length) {
    h(2, t('week.title'))
    for (const q of [...QUADRANTS, undefined]) {
      const items = tasks.filter((x) => x.quadrant === q)
      if (!items.length) continue
      out.push(`**${q ? t(`week.quadrant.${q}`) : t('week.unsorted')}**`)
      for (const x of items)
        out.push(`- ${x.moved ? '★ ' : ''}${text(x.text, '  ')}${has(x.when) ? ` (${text(x.when)})` : ''}`)
      out.push('')
    }
  }

  // ---- if-then plans (every module)
  const plans = data.plans ?? []
  if (plans.length) {
    h(2, t('home.plans'))
    for (const p of plans)
      out.push(
        `- ${p.done ? '✓ ' : ''}${t('plan.if')} ${text(p.condition)}, ${t('plan.then')} ${text(p.action)} · ${t('home.module')} ${Number(p.moduleId)}`,
      )
  }

  // ---- calm (module 5)
  const journal = data.journal ?? []
  const uses = data.strengthUses ?? []
  const wheels = [...(data.wheels ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const reps = data.reps ?? []
  const strengths = settings.strengths.filter(has)
  if (settings.saboteurs.length || strengths.length || journal.length || uses.length || wheels.length || reps.length) {
    h(2, t('calm.title'))
    if (settings.saboteurs.length)
      out.push(`**${t('profile.saboteurs')}:** ${settings.saboteurs.map((s) => t(`sab.${s}`)).join(', ')}`, '')
    if (strengths.length) out.push(`**${t('profile.strengths')}:** ${strengths.map((s) => text(s)).join(', ')}`, '')
    if (uses.length) {
      h(3, t('profile.uses'))
      for (const u of uses) out.push(`- ${fmtDate(u.date)}, ${text(u.strength)}: ${text(u.text, '  ')}`)
    }
    if (journal.length) {
      h(3, t('journal.title'))
      for (const j of journal) {
        out.push(`**${fmtDate(j.date)}**`, '')
        field(t('journal.happened'), j.happened)
        field(t('journal.thought'), j.thought)
        field(t('journal.felt'), j.felt)
        field(t('journal.did'), j.did)
        if (j.saboteur) field(t('journal.saboteur'), t(`sab.${j.saboteur}`))
        field(t('journal.friend'), j.friend)
        out.push('')
      }
    }
    const last = wheels.at(-1)
    if (last) {
      h(3, t('wheel.title'))
      out.push(t('book.md.wheelOn', { date: fmtDate(last.date) }), '')
      WHEEL_AREAS.forEach((a, i) => out.push(`- ${t(`wheel.area.${a}`)}: ${last.values[i] ?? ''}`))
      if (last.swls.some((v) => v > 0)) {
        out.push('', `**${t('swls.title')}**`)
        SWLS_ITEMS.forEach((k, i) => out.push(`- ${t(`swls.${k}`)}: ${last.swls[i] || ''}`))
      }
    }
    if (reps.length) out.push('', t('rep.count', { n: reps.length }))
  }

  // ---- vision (modules 6–7)
  const v = data.vision?.[0]
  if (v) {
    const values = v.values.filter((x) => has(x.text))
    const L = v.letter
    const state = letterState(L, today)
    const sheet = VISION_SECTIONS.filter((s) => has(v.worksheet[s]))
    const regret = REGRET_AREAS.filter((a) => has(v.regret?.[a]))
    const yesno = (['yes', 'no', 'changes', 'hardest'] as const).filter((k) => has(v.yesno?.[k]))
    const retro = (['tool', 'habit', 'aha', 'word'] as const).filter((k) => has(v.retro?.[k]))
    // the letters read (a letter becomes a past one only once read; anything else, from a backup, stays out)
    const past = (v.pastLetters ?? []).filter((p) => letterState(p, today) === 'read' && (has(p.text) || has(p.reply)))
    const anything =
      values.length ||
      v.valueActs.length ||
      has(L?.text) ||
      L?.sealed ||
      past.length ||
      sheet.length ||
      regret.length ||
      yesno.length ||
      v.checkin?.log?.length ||
      retro.length
    if (anything) h(2, t('vision.title'))
    if (values.length) {
      h(3, t('values.title'))
      for (const x of values)
        out.push(`- ${x.chosen ? '★ ' : ''}${text(x.text)}${x.nonNegotiable ? ` (${t('values.nonneg.short')})` : ''}`)
    }
    if (v.valueActs.length) {
      h(3, t('values.acts'))
      for (const a of v.valueActs)
        out.push(`- ${fmtDate(a.date)}${has(a.value) ? `, ${text(a.value)}` : ''}: ${text(a.text, '  ')}`)
    }
    // a letter is written out only once read; before that only its date (sealed) or that it has come (arrived)
    if (state === 'sealed') {
      h(3, t('letter.title'))
      out.push(t('book.md.sealed', { date: fmtDate(L!.deliverDate ?? today) }))
    } else if (state === 'arrived') {
      h(3, t('letter.title'))
      out.push(t('book.md.arrived', { date: fmtDate(L!.deliverDate ?? today) }))
    } else if (has(L?.text) || has(L?.reply)) {
      h(3, t('letter.title'))
      para(L?.text)
      if (has(L?.reply)) {
        out.push(`**${t('letter.reply')}**`, '')
        para(L?.reply)
      }
    }
    if (past.length) {
      h(3, t('letter.past', { n: past.length }))
      for (const p of past) {
        h(4, p.deliverDate ? fmtDate(p.deliverDate) : t('letter.title'))
        para(p.text)
        if (has(p.reply)) {
          out.push(`**${t('letter.reply')}**`, '')
          para(p.reply)
        }
      }
    }
    if (sheet.length) {
      h(3, t('sheet.title'))
      for (const s of sheet) field(t(`sheet.${s}`), v.worksheet[s])
    }
    if (regret.length || yesno.length) {
      h(3, t('regret.title'))
      for (const a of regret) field(t(`regret.${a}`), v.regret?.[a])
      if (yesno.length) {
        out.push('', `**${t('yesno.title')}**`)
        for (const k of yesno) field(t(`yesno.${k}`), v.yesno?.[k])
      }
    }
    if (v.checkin?.log?.length) {
      h(3, t('checkin.title'))
      for (const c of v.checkin.log) out.push(`- ${fmtDate(c.date)}: ${text(c.note, '  ')}`)
    }
    if (retro.length) {
      h(3, t('retro.title'))
      for (const k of retro) field(t(`retro.${k}`), v.retro?.[k])
    }
  }

  // ---- notes per module (the Dream Friend's notes are a separate store and never part of the book, FR-61)
  const notes = [...(data.moduleNotes ?? [])]
    .filter((n) => has(n.takeaways) || has(n.oneWord))
    .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
  if (notes.length) {
    h(2, t('module.takeaways.mine'))
    for (const n of notes) {
      h(3, `${t('home.module')} ${Number(n.moduleId)}`)
      para(n.takeaways)
      field(t('module.feedback'), n.oneWord)
    }
  }
  return (
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}
