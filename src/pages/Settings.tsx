import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT, UI_LOCALES, LOCALE_META } from '../i18n'
import { useSettings } from '../state/settings'
import { db, type Role, type Config } from '../db/db'
import { exportAll, importAll, downloadJson } from '../db/exportImport'
import { comboIssue, reconcile } from '../state/combos'

export default function Settings() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const issue = comboIssue(settings.role, settings.config)
  const pickRole = (r: Role) => { const x = reconcile(r, settings.config, 'role'); update({ role: x.role, config: x.config, friendToday: false }) }
  const pickConfig = (c: Config) => { const x = reconcile(settings.role, c, 'config'); update({ role: x.role, config: x.config }) }

  const doExport = async () => downloadJson(`cartea-visurilor-${new Date().toISOString().slice(0, 10)}.json`, await exportAll())
  const doImport = async (f: File) => {
    try {
      const r = await importAll(JSON.parse(await f.text()))
      setMsg(t('settings.import.ok', r))
    } catch { setMsg(t('settings.import.err')) }
  }
  const wipe = async () => {
    if (!confirm(t('settings.danger.confirm'))) return
    await db.delete(); location.reload()
  }

  return (
    <>
      <h1>{t('settings.title')}</h1>
      <div className="card">
        <div className="field"><label>{t('settings.lang')}</label>
          <div className="row">{UI_LOCALES.map((l) => <button key={l} className={`chip ${settings.uiLocale === l ? 'on' : ''}`} onClick={() => update({ uiLocale: l })}>{LOCALE_META[l].name}</button>)}</div>
        </div>
        <div className="field"><label>{t('settings.theme')}</label>
          <div className="row">{(['system', 'light', 'dark'] as const).map((x) => <button key={x} className={`chip ${settings.theme === x ? 'on' : ''}`} onClick={() => update({ theme: x })}>{t(`settings.theme.${x}`)}</button>)}</div>
        </div>
      </div>
      <div className="card">
        <div className="field"><label>{t('settings.role')}</label>
          <p className="small muted" style={{ margin: 0 }}>{t('settings.role.help')}</p>
          <div className="row">{(['dreamer', 'friend', 'both'] as Role[]).map((r) => <button key={r} className={`chip ${settings.role === r ? 'on' : ''}`} onClick={() => pickRole(r)}>{t(`onboarding.role.${r}`)}</button>)}</div>
          <p className="small" style={{ margin: '4px 0 0' }}>{t(`role.help.${settings.role}`)}</p>
        </div>
        <div className="field"><label>{t('settings.config')}</label>
          <p className="small muted" style={{ margin: 0 }}>{t('settings.config.help')}</p>
          <div className="row">{(['solo', 'pair', 'group'] as Config[]).map((c) => <button key={c} className={`chip ${settings.config === c ? 'on' : ''}`} onClick={() => pickConfig(c)}>{t(`onboarding.config.${c}`)}</button>)}</div>
          <p className="small" style={{ margin: '4px 0 0' }}>{t(`config.help.${settings.config}`)}</p>
          {issue && <p className="notice small">{t(`combo.${issue}`)}</p>}
        </div>
        <div className="field"><label htmlFor="sd">{t('onboarding.start')}</label><input id="sd" type="date" value={settings.startDate ?? ''} onChange={(e) => update({ startDate: e.target.value })} /></div>
        <div className="field"><label htmlFor="cd">{t('onboarding.cadence')}</label><input id="cd" type="number" min={7} max={42} value={settings.cadenceDays} onChange={(e) => update({ cadenceDays: Number(e.target.value) || 14 })} /></div>
        <label className="row" style={{ minHeight: 44 }}><input type="checkbox" checked={settings.paperMode} onChange={(e) => update({ paperMode: e.target.checked })} /> {t('onboarding.paper')}</label>
      </div>
      <div className="card">
        <p className="small muted">{t('settings.privacy')}</p>
        <div className="row">
          <button className="btn" onClick={doExport}>{t('settings.export')}</button>
          <button className="btn" onClick={() => file.current?.click()}>{t('settings.import')}</button>
          <input ref={file} type="file" accept="application/json" className="visually-hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
        {msg && <p className="small">{msg}</p>}
      </div>
      <div className="card">
        <Link to="/sources">{t('settings.sources')}</Link>
      </div>
      <button className="btn ghost small" onClick={wipe}>{t('settings.danger')}</button>
    </>
  )
}
