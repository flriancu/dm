import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { setValueItem, addValueAct } from '../../db/vision'
import { submitDraft } from '../../state/useAction'
import { MAX_CHOSEN_VALUES, TEXT_SHORT, type VisionDoc } from '../../db/db'

/** Module 6: ten values, up to five chosen (some non-negotiable), and the log of acts done for a value (FR-40). */
export default function Values({ v }: { v: VisionDoc }) {
  const { t, fmtDate } = useT()
  const chosenCount = v.values.filter((x) => x.chosen).length
  const [act, setAct] = useState('')
  const [actValue, setActValue] = useState('')
  const addAct = submitDraft(
    act,
    setAct,
    '',
    (text) => addValueAct(actValue, text),
    (text) => !!text.trim(),
  )
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
              onSave={(text) => setValueItem(i, { text })}
            />
            <button
              className={`chip ${x.chosen ? 'on' : ''}`}
              onClick={() => setValueItem(i, { chosen: !x.chosen })}
              disabled={!x.chosen && chosenCount >= MAX_CHOSEN_VALUES}
              aria-pressed={!!x.chosen}
              aria-label={t('values.choose')}
              title={t('values.choose')}
            >
              {x.chosen ? '★' : '☆'}
            </button>
            {x.chosen && (
              <button
                className={`chip ${x.nonNegotiable ? 'on' : ''}`}
                onClick={() => setValueItem(i, { nonNegotiable: !x.nonNegotiable })}
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
              .map((x, i) => (
                <option key={`${i}-${x.text}`} value={x.text}>
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
            maxLength={TEXT_SHORT}
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
