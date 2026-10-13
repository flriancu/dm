/** Printable sheets: each `.sheet` section prints on its own A4 page. */
import { useT } from '../i18n'
import { HABIT_PARTS } from '../db/db'
import { useDreamWork } from '../db/hooks'

export function HabitSheet() {
  const { t, fmtDate } = useT()
  const { dream, work } = useDreamWork()
  const log = [...(work?.habitLog ?? [])].sort((a, b) => a.week.localeCompare(b.week))
  const rows = [...log, ...Array.from({ length: Math.max(0, 16 - log.length) }, () => null)]
  return (
    <section className="sheet">
      <h1>{t('book.sheet.habit')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <table>
        <thead><tr>{HABIT_PARTS.map((h) => <th key={h}>{t(`habit.${h}`)}</th>)}</tr></thead>
        <tbody><tr>{HABIT_PARTS.map((h) => <td key={h}>{work?.habit?.[h] ?? ''}<div style={{ minHeight: '18mm' }} /></td>)}</tr></tbody>
      </table>
      <h3>{t('habit.log')}</h3>
      <table>
        <thead><tr><th style={{ width: '9em' }}>{t('book.col.week')}</th><th style={{ width: '6em' }}>{t('book.col.done')}</th><th>{t('book.col.sent')}</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{r ? fmtDate(r.week) : ''}</td><td>{r?.done ? '✓' : ''}</td><td>{r?.note ?? ''}</td></tr>)}</tbody>
      </table>
    </section>
  )
}

export function FriendsSheet() {
  const { t } = useT()
  const { dream, work } = useDreamWork()
  const friends = [...(work?.friends ?? []), {}, {}, {}].slice(0, 3)
  return (
    <section className="sheet">
      <h1>{t('book.sheet.friends')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <table>
        <thead><tr><th style={{ width: '30%' }}>{t('book.col.person')}</th><th>{t('book.col.role')}</th></tr></thead>
        <tbody>{friends.map((f, i) => <tr key={i}><td>{f.name ?? ''}<div style={{ minHeight: '10mm' }} /></td><td>{f.role ? t(`friends.role.${f.role}`) : ''}{f.day ? ` · ${f.day}` : ''}</td></tr>)}</tbody>
      </table>
      <h3>{t('friends.ask')}</h3>
      <div className="box">{friends.find((f) => f.role === 'ask')?.ask ?? ''}</div>
    </section>
  )
}

export function FearSheet() {
  const { t } = useT()
  const { dream, work } = useDreamWork()
  return (
    <section className="sheet">
      <h1>{t('book.sheet.fear')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <h3>{t('fear.fear')}</h3><p>{t('fear.fear.q')}</p>
      <div className="box">{work?.fear?.fear ?? ''}</div>
      <h3>{t('fear.goodEnough')}</h3><p>{t('fear.goodEnough.q')}</p>
      <div className="box">{work?.fear?.goodEnough ?? ''}</div>
    </section>
  )
}

export function LetgoSheet() {
  const { t } = useT()
  const { dream, work } = useDreamWork()
  return (
    <section className="sheet">
      <h1>{t('book.sheet.letgo')}</h1>
      <p>{t('letgo.help')}</p>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <h3>{t('letgo.signs')}</h3>
      <ul>{['oscillate', 'sleep', 'stalled', 'outside'].map((k) => <li key={k}>☐ {t(`letgo.sign.${k}`)}</li>)}</ul>
      {(['costs', 'benefits', 'replacement'] as const).map((k) => <div key={k}><h3>{t(`letgo.${k}`)}</h3><div className="box" style={{ minHeight: '22mm' }}>{work?.letgo?.[k] ?? ''}</div></div>)}
      <p>☐ {t('letgo.continue')} &nbsp;&nbsp; ☐ {t('letgo.release')} &nbsp;&nbsp; {t('book.col.date')}: ____________</p>
    </section>
  )
}
