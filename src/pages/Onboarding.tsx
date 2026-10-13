import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT, UI_LOCALES, LOCALE_META, type UiLocale } from '../i18n'
import { useSettings } from '../state/settings'
import { today, type Role, type Config } from '../db/db'
import RoleConfigPicker from '../components/RoleConfigPicker'

export default function Onboarding() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const [uiLocale, setLocale] = useState<UiLocale>(settings.uiLocale)
  const [role, setRole] = useState<Role | undefined>(undefined)
  const [config, setConfig] = useState<Config | undefined>(undefined)
  const [startDate, setStart] = useState(settings.startDate ?? today())
  const [cadenceDays, setCadence] = useState(settings.cadenceDays)
  const [paperMode, setPaper] = useState(settings.paperMode)
  const ready = !!role && !!config

  const go = async () => {
    if (!ready) return
    await update({ role: role!, config: config!, uiLocale, startDate, cadenceDays, paperMode, onboarded: true })
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

      <RoleConfigPicker role={role} config={config} onChange={(n) => { setRole(n.role); setConfig(n.config) }} />

      {ready && (
        <>
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
      )}
    </>
  )
}
