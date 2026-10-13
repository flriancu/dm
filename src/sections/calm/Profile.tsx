import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { useSettings } from '../../state/settings'
import { useStrengthUses, addStrengthUse, toggleSaboteur, setStrength } from '../../db/calm'
import { SABOTEURS } from '../../db/db'

/** Module 5: the top three saboteurs, the five strengths, and the log of strength uses (FR-30, FR-36). */
export default function Profile() {
  const { t, fmtDate } = useT()
  const { settings } = useSettings()
  const uses = useStrengthUses() ?? []
  const [useText, setUseText] = useState('')
  const [useStrength, setUseStrength] = useState('')
  const top = settings.saboteurs
  const strengths = [...settings.strengths, '', '', '', '', ''].slice(0, 5)
  const addUse = async () => {
    if (!useText.trim()) return
    await addStrengthUse(useStrength || strengths.find(Boolean) || '', useText.trim())
    setUseText('')
  }
  return (
    <>
      <SectionHead id="profile" label={t('calm.section.profile')} title={t('profile.title')} />
      <p className="muted small">{t('profile.help')}</p>
      <div className="card">
        <div className="field">
          <label>
            {t('profile.saboteurs')} <span className="muted">({top.length}/3)</span>
          </label>
          <div className="row">
            {SABOTEURS.filter((s) => s !== 'judge').map((s) => (
              <button
                key={s}
                className={`chip ${top.includes(s) ? 'on' : ''}`}
                onClick={() => toggleSaboteur(s)}
                disabled={!top.includes(s) && top.length >= 3}
              >
                {t(`sab.${s}`)}
              </button>
            ))}
          </div>
        </div>
        <p className="small">
          <strong>{t('sab.judge')}</strong> — {t('sab.judge.desc')}
        </p>
        {top.map((s) => (
          <p key={s} className="small">
            <strong>{t(`sab.${s}`)}</strong> — {t(`sab.${s}.desc`)}
          </p>
        ))}
        <p className="small muted">{t('profile.saboteurs.note')}</p>
      </div>
      <div className="card">
        <div className="field">
          <label>{t('profile.strengths')}</label>
        </div>
        {strengths.map((s, i) => (
          <div className="field" key={i}>
            <label htmlFor={`str-${i}`}>{t('profile.strength', { n: i + 1 })}</label>
            <AutoText
              id={`str-${i}`}
              placeholder={t(`profile.strength.placeholder.${i + 1}`)}
              value={s}
              onSave={(v) => setStrength(i, v)}
            />
          </div>
        ))}
      </div>
      <h3>{t('profile.uses')}</h3>
      <p className="muted small">{t('profile.uses.help')}</p>
      <div className="card">
        <div className="field">
          <label htmlFor="use-strength">{t('profile.uses.which')}</label>
          <select id="use-strength" value={useStrength} onChange={(e) => setUseStrength(e.target.value)}>
            <option value="">{t('profile.uses.which.none')}</option>
            {strengths.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="use-text">{t('profile.uses.what')}</label>
          <input
            id="use-text"
            type="text"
            placeholder={t('profile.uses.placeholder')}
            value={useText}
            onChange={(e) => setUseText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUse()}
          />
        </div>
        <button className="btn" onClick={addUse} disabled={!useText.trim()}>
          {t('profile.uses.add')}
        </button>
        {uses.length > 0 && (
          <ul className="list small">
            {uses.map((u) => (
              <li key={u.id}>
                <span className="muted">{fmtDate(u.date)}</span> · <strong>{u.strength}</strong> — {u.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/profile">{t('profile.print')}</Link>
      </p>
    </>
  )
}
