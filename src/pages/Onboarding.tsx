import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT, UI_LOCALES, LOCALE_META, type UiLocale } from '../i18n'
import { useSettings } from '../state/settings'
import { today, type Role, type Config } from '../db/db'

export default function Onboarding() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const [role, setRole] = useState<Role>(settings.role)
  const [config, setConfig] = useState<Config>(settings.config)
  const [uiLocale, setLocale] = useState<UiLocale>(settings.uiLocale)
  const [startDate, setStart] = useState(settings.startDate ?? today())
  const [cadenceDays, setCadence] = useState(settings.cadenceDays)
  const [paperMode, setPaper] = useState(settings.paperMode)

  const go = async () => {
    await update({ role, config, uiLocale, startDate, cadenceDays, paperMode, onboarded: true })
    nav('/', { replace: true })
  }

  return (
    <>
      <h1>{t('onboarding.title')}</h1>
      <p className="muted">{t('onboarding.intro')}</p>

      <div className="card">
        <div className="field">
          <label>{t('onboarding.lang')}</label>
          <div className="row">
            {UI_LOCALES.map((l) => (
              <button key={l} className={`chip ${uiLocale === l ? 'on' : ''}`} onClick={() => setLocale(l)}>{LOCALE_META[l].name}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>{t('onboarding.role')}</label>
          <div className="row">
            {(['dreamer', 'friend', 'both'] as Role[]).map((r) => (
              <button key={r} className={`chip ${role === r ? 'on' : ''}`} onClick={() => setRole(r)}>{t(`onboarding.role.${r}`)}</button>
            ))}
          </div>
          <p className="small muted">{t('onboarding.role.help')}</p>
        </div>
        <div className="field">
          <label>{t('onboarding.config')}</label>
          <div className="row">
            {(['solo', 'pair', 'group'] as Config[]).map((c) => (
              <button key={c} className={`chip ${config === c ? 'on' : ''}`} onClick={() => setConfig(c)}>{t(`onboarding.config.${c}`)}</button>
            ))}
          </div>
          <p className="small muted">{t('onboarding.config.help')}</p>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="start">{t('onboarding.start')}</label>
          <input id="start" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cad">{t('onboarding.cadence')}</label>
          <input id="cad" type="number" min={7} max={42} value={cadenceDays} onChange={(e) => setCadence(Number(e.target.value) || 14)} />
        </div>
      </div>

      {role !== 'friend' && (
        <div className="card">
          <label className="row" style={{ minHeight: 44 }}>
            <input type="checkbox" checked={paperMode} onChange={(e) => setPaper(e.target.checked)} /> {t('onboarding.paper')}
          </label>
          <p className="small muted">{t('onboarding.paper.help')}</p>
        </div>
      )}

      <button className="btn primary" onClick={go}>{t('onboarding.go')}</button>
    </>
  )
}
