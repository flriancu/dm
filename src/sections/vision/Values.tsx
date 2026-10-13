import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { today, type VisionDoc, type ValueItem } from '../../db/db'

/** Module 6: ten values, up to five chosen (some non-negotiable), and the log of acts done for a value (FR-40). */
export default function Values({ v, save }: { v: VisionDoc; save: (patch: Partial<VisionDoc>) => Promise<unknown> }) {
  const { t, fmtDate } = useT()
  const setValue = (i: number, p: Partial<ValueItem>) => {
    const n = v.values.map((x) => ({ ...x }))
    n[i] = { ...n[i], ...p }
    save({ values: n })
  }
  const chosenCount = v.values.filter((x) => x.chosen).length
  const [act, setAct] = useState('')
  const [actValue, setActValue] = useState('')
  const addAct = async () => {
    if (!act.trim()) return
    await save({ valueActs: [...v.valueActs, { date: today(), value: actValue, text: act.trim() }] })
    setAct('')
  }
  return (
    <>
      <SectionHead
        id="values"
        label={t('vision.section.values')}
        title={t('values.title')}
        right={t('values.chosen', { n: chosenCount })}
      />
      <p className="muted small">{t('values.help')}</p>
      <div className="card">
        {v.values.map((x, i) => (
          <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
            <AutoText
              aria-label={t('values.n', { n: i + 1 })}
              placeholder={t(`values.placeholder.${(i % 5) + 1}`)}
              style={{ flex: 1 }}
              value={x.text}
              onSave={(v) => setValue(i, { text: v })}
            />
            <button
              className={`chip ${x.chosen ? 'on' : ''}`}
              onClick={() => setValue(i, { chosen: !x.chosen, nonNegotiable: x.chosen ? false : x.nonNegotiable })}
              disabled={!x.chosen && chosenCount >= 5}
              aria-pressed={!!x.chosen}
              aria-label={t('values.choose')}
              title={t('values.choose')}
            >
              {x.chosen ? '★' : '☆'}
            </button>
            {x.chosen && (
              <button
                className={`chip ${x.nonNegotiable ? 'on' : ''}`}
                onClick={() => setValue(i, { nonNegotiable: !x.nonNegotiable })}
                aria-pressed={!!x.nonNegotiable}
                aria-label={t('values.nonneg')}
                title={t('values.nonneg')}
              >
                {t('values.nonneg.short')}
              </button>
            )}
          </div>
        ))}
        <p className="small muted">{t('values.legend')}</p>
      </div>
      <h3>{t('values.acts')}</h3>
      <p className="muted small">{t('values.acts.help')}</p>
      <div className="card">
        <div className="field">
          <label htmlFor="act-value">{t('values.acts.which')}</label>
          <select id="act-value" value={actValue} onChange={(e) => setActValue(e.target.value)}>
            <option value="">{t('values.acts.which.none')}</option>
            {v.values
              .filter((x) => x.chosen && x.text)
              .map((x) => (
                <option key={x.text} value={x.text}>
                  {x.text}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="act-text">{t('values.acts.what')}</label>
          <input
            id="act-text"
            type="text"
            placeholder={t('values.acts.placeholder')}
            value={act}
            onChange={(e) => setAct(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAct()}
          />
        </div>
        <button className="btn" onClick={addAct} disabled={!act.trim()}>
          {t('values.acts.add')}
        </button>
        {v.valueActs.length > 0 && (
          <ul className="list small">
            {[...v.valueActs].reverse().map((a, i) => (
              <li key={i}>
                <span className="muted">{fmtDate(a.date)}</span> · <strong>{a.value}</strong> — {a.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/values">{t('values.print')}</Link>
      </p>
    </>
  )
}
