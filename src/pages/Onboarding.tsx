import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT, UI_LOCALES, LOCALE_META } from '../i18n'
import { useSettings } from '../state/settings'
import { startDateKey } from '../state/roles'
import { type Role, type Config } from '../db/db'
import RoleConfigPicker from '../components/RoleConfigPicker'
import Stepper from '../components/Stepper'
import DateField from '../components/DateField'

export default function Onboarding() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const [role, setRole] = useState<Role | undefined>(undefined)
  const [config, setConfig] = useState<Config | undefined>(undefined)
  const [startDate, setStart] = useState(settings.startDate ?? '')
  const [cadenceDays, setCadence] = useState(settings.cadenceDays)
  const [paperMode, setPaper] = useState(settings.paperMode)
  const ready = !!role && !!config

  const go = async () => {
    if (!ready) return
    await update({
      role: role!,
      config: config!,
      startDate: startDate || undefined,
      cadenceDays,
      paperMode,
      onboarded: true,
    })
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
              <button
                key={l}
                className={`chip ${settings.uiLocale === l ? 'on' : ''}`}
                onClick={() => update({ uiLocale: l })}
              >
                {LOCALE_META[l].name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>{t('settings.theme')}</label>
          <div className="row">
            {(['system', 'light', 'dark'] as const).map((x) => (
              <button
                key={x}
                className={`chip ${settings.theme === x ? 'on' : ''}`}
                onClick={() => update({ theme: x })}
              >
                {t(`settings.theme.${x}`)}
              </button>
            ))}
          </div>
          <p className="small muted">{t('onboarding.theme.help')}</p>
        </div>
      </div>

      <RoleConfigPicker
        role={role}
        config={config}
        onChange={(n) => {
          setRole(n.role)
          setConfig(n.config)
        }}
      />

      {ready && (
        <>
          <div className="card">
            <div className="field">
              <label htmlFor="start">{t(startDateKey({ role: role!, config: config! }))}</label>
              <DateField id="start" value={startDate} onChange={setStart} />
              <p className="small muted">{t('onboarding.start.help')}</p>
            </div>
            <div className="field">
              <label htmlFor="cad">{t('onboarding.cadence')}</label>
              <Stepper id="cad" min={7} max={42} value={cadenceDays} onChange={setCadence} />
              {cadenceDays < 14 && <p className="small notice">{t('onboarding.cadence.help')}</p>}
            </div>
          </div>

          {role !== 'friend' && (
            <div className="card">
              <label className="row" style={{ minHeight: 44 }}>
                <input type="checkbox" checked={paperMode} onChange={(e) => setPaper(e.target.checked)} />{' '}
                {t('onboarding.paper')}
              </label>
              <p className="small muted">{t('onboarding.paper.help')}</p>
            </div>
          )}

          <button className="btn primary" onClick={go}>
            {t('onboarding.go')}
          </button>
        </>
      )}
    </>
  )
}
