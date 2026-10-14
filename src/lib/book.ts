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
 * in the interface language. A sealed letter stays sealed: only its date is written.
 */
export interface BookInput {
  data: Partial<BackupTables>
  settings: Settings
  t: T
  fmtDate: (d: string) => string
  today: string
}

/** A user line that would start a heading, list, quote or rule in Markdown gets a backslash. */
export function escapeLine(line: string): string {
  return /^\s*(#|>|[-*+]\s|\d+[.)]\s|[-*_]{3,}\s*$|```)/.test(line) ? line.replace(/^(\s*)/, '$1\\') : line
}

/** User text with its line breaks kept (Markdown hard breaks), each line escaped. */
export function text(s: string | undefined, indent = ''): string {
  if (!s) return ''
  return s
    .trim()
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => escapeLine(l.trimEnd()))
    .join(`  \n${indent}`)
}

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

  // ---- the chosen dream and its worksheets (modules 2–4, letting go)
  const chosen = dreams.find((d) => d.chosen)
  const work = chosen ? (data.dreamWork ?? []).find((w) => w.dreamId === chosen.id) : undefined
  if (chosen) {
    h(2, t('home.chosen'))
    para(chosen.text)
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
    const anything =
      values.length ||
      v.valueActs.length ||
      has(L?.text) ||
      L?.sealed ||
      v.pastLetters?.length ||
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
    if (state === 'sealed' || state === 'arrived') {
      h(3, t('letter.title'))
      out.push(t('book.md.sealed', { date: fmtDate(L!.deliverDate ?? today) }))
    } else if (has(L?.text) || has(L?.reply)) {
      h(3, t('letter.title'))
      para(L?.text)
      if (has(L?.reply)) {
        out.push(`**${t('letter.reply')}**`, '')
        para(L?.reply)
      }
    }
    for (const p of v.pastLetters ?? []) {
      h(4, `${t('letter.title')}${p.deliverDate ? `, ${fmtDate(p.deliverDate)}` : ''}`)
      para(p.text)
      if (has(p.reply)) para(p.reply)
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

  // ---- notes per module, and the Dream Friend's notes
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
  const fnotes = [...(data.friendNotes ?? [])].sort((a, b) =>
    (a.moduleId + a.created).localeCompare(b.moduleId + b.created),
  )
  if (fnotes.length) {
    h(2, t('friend.notes'))
    for (const n of fnotes)
      out.push(`- ${t('home.module')} ${Number(n.moduleId)}, ${fmtDate(n.created)}: ${text(n.text, '  ')}`)
  }

  return (
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}
