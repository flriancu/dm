import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT, UI_LOCALES, LOCALE_META } from '../i18n'
import { useSettings } from '../state/settings'
import { db, type Role, type Config } from '../db/db'
import { exportAll, importAll, downloadJson } from '../db/exportImport'
import { comboIssue } from '../state/combos'
import RoleConfigPicker from '../components/RoleConfigPicker'

export default function Settings() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<{ role?: Role; config?: Config }>({})
  const issue = comboIssue(settings.role, settings.config)

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
  const startEdit = () => { setDraft({}); setEditing(true) }
  const saveEdit = async () => {
    if (!draft.role || !draft.config) return
    await update({ role: draft.role, config: draft.config, friendToday: false })
    setEditing(false)
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

      {!editing ? (
        <div className="card">
          <div className="small muted">{t('settings.role')}</div>
          <div><strong>{t(`onboarding.role.${settings.role}`)}</strong> <span className="small">— {t(`role.help.${settings.role}`)}</span></div>
          <div className="small muted" style={{ marginTop: 8 }}>{t('settings.config')}</div>
          <div><strong>{t(`onboarding.config.${settings.config}`)}</strong> <span className="small">— {t(settings.config === 'group' && settings.role === 'both' ? 'config.help.group.both' : `config.help.${settings.config}`)}</span></div>
          {issue && <p className="notice small">{t(`combo.${issue}`)}</p>}
          <button className="btn sm" onClick={startEdit}>{t('settings.change')}</button>
        </div>
      ) : (
        <>
          <RoleConfigPicker role={draft.role} config={draft.config} onChange={setDraft} />
          <div className="row" style={{ margin: '8px 0 16px' }}>
            <button className="btn primary" onClick={saveEdit} disabled={!draft.role || !draft.config}>{t('settings.saveChoice')}</button>
            <button className="btn ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
          </div>
        </>
      )}

      <div className="card">
        <div className="field"><label htmlFor="sd">{t('onboarding.start')}</label><input id="sd" type="date" value={settings.startDate ?? ''} onChange={(e) => update({ startDate: e.target.value })} /></div>
        <div className="field"><label htmlFor="cd">{t('onboarding.cadence')}</label><input id="cd" type="number" min={7} max={42} value={settings.cadenceDays} onChange={(e) => update({ cadenceDays: Number(e.target.value) || 14 })} /></div>
        {settings.role !== 'friend' && (
          <label className="row" style={{ minHeight: 44 }}><input type="checkbox" checked={settings.paperMode} onChange={(e) => update({ paperMode: e.target.checked })} /> {t('onboarding.paper')}</label>
        )}
      </div>
      <div className="card">
        <div className="small muted">{t('settings.backup')}</div>
        <p className="small muted" style={{ marginTop: 2 }}>{t('settings.privacy')}</p>
        <div>
          <button className="btn" onClick={doExport}>{t('settings.export')}</button>
          <p className="small muted" style={{ margin: '6px 0 0' }}>{t('settings.export.help')}</p>
        </div>
        <div>
          <button className="btn" onClick={() => file.current?.click()}>{t('settings.import')}</button>
          <p className="small muted" style={{ margin: '6px 0 0' }}>{t('settings.import.help')}</p>
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
