import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import SectionHead from '../../components/SectionHead'
import { useJournal, addJournalEntry, deleteJournalEntry } from '../../db/calm'
import { SABOTEURS, type JournalEntry } from '../../db/db'

/** Module 5: the catch-the-saboteur journal (FR-31). */
const JOURNAL_FIELDS = ['happened', 'thought', 'felt', 'did', 'friend'] as const

export default function Journal() {
  const { t, fmtDate } = useT()
  const entries = useJournal() ?? []
  const [draft, setDraft] = useState<Partial<JournalEntry>>({})
  const [open, setOpen] = useState(false)
  const save = async () => {
    if (!draft.happened?.trim()) return
    await addJournalEntry(draft)
    setDraft({})
    setOpen(false)
  }
  return (
    <>
      <SectionHead id="journal" label={t('calm.section.journal')} title={t('journal.title')} />
      <p className="muted small">{t('journal.help')}</p>
      {!open && (
        <p>
          <button className="btn primary" onClick={() => setOpen(true)}>
            {t('journal.new')}
          </button>
        </p>
      )}
      {open && (
        <div className="card">
          {JOURNAL_FIELDS.map((f) => (
            <div className="field" key={f}>
              <label htmlFor={`j-${f}`}>{t(`journal.${f}`)}</label>
              <textarea
                id={`j-${f}`}
                placeholder={t(`journal.${f}.placeholder`)}
                value={draft[f] ?? ''}
                onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                style={{ minHeight: 64 }}
              />
            </div>
          ))}
          <div className="field">
            <label>{t('journal.saboteur')}</label>
            <div className="row">
              {SABOTEURS.map((s) => (
                <button
                  key={s}
                  className={`chip ${draft.saboteur === s ? 'on' : ''}`}
                  onClick={() => setDraft({ ...draft, saboteur: s })}
                >
                  {t(`sab.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <button className="btn primary" onClick={save} disabled={!draft.happened?.trim()}>
              {t('journal.save')}
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setDraft({})
                setOpen(false)
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      {entries.length === 0 && !open && (
        <p className="muted" style={{ marginTop: 0 }}>
          {t('journal.empty')}
        </p>
      )}
      {entries.map((e) => (
        <details className="card" key={e.id}>
          <summary>
            {fmtDate(e.date)} · {e.saboteur ? t(`sab.${e.saboteur}`) : t('journal.noSaboteur')} ·{' '}
            {e.happened.slice(0, 40)}
            {e.happened.length > 40 ? '…' : ''}
          </summary>
          {JOURNAL_FIELDS.map((f) =>
            e[f] ? (
              <p key={f} className="small">
                <strong>{t(`journal.${f}`)}</strong> {e[f]}
              </p>
            ) : null,
          )}
          <button className="btn sm ghost" onClick={() => deleteJournalEntry(e)}>
            {t('journal.delete')}
          </button>
        </details>
      ))}
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/journal">{t('journal.print')}</Link>
      </p>
    </>
  )
}
