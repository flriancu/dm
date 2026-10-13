import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT, UI_LOCALES, LOCALE_META } from '../i18n'
import { useSettings } from '../state/settings'
import { useAction } from '../state/useAction'
import { startDateKey } from '../state/roles'
import { today, THEMES, type Role, type Config } from '../db/db'
import { exportAll, downloadJson, readBackupFile, planImport, applyImport, ImportError } from '../db/exportImport'
import { replaceData, wipeAll } from '../db/lifecycle'
import { comboIssue, configHelpKey } from '../state/combos'
import RoleConfigPicker from '../components/RoleConfigPicker'
import Stepper from '../components/Stepper'
import DateField from '../components/DateField'

export default function Settings() {
  const { t, fmtDate } = useT()
  const { settings, update } = useSettings()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<{ role?: Role; config?: Config }>({})
  const issue = comboIssue(settings.role, settings.config)

  const [doExport, exporting] = useAction(async () =>
    downloadJson(`cartea-visurilor-${today()}.json`, await exportAll()),
  )
  const [doImport, importing] = useAction(async (f: File) => {
    setMsg('')
    try {
      const plan = await planImport(await readBackupFile(f))
      const date = plan.exportedAt ? fmtDate(plan.exportedAt) : ''
      const question = [
        t(date ? 'settings.import.confirm.dated' : 'settings.import.confirm', {
          date,
          now: plan.current.dreams,
          file: plan.incoming.dreams,
        }),
        plan.kept.length ? t('settings.import.confirm.kept') : '',
      ].join(' ')
      if (!confirm(question.trim())) return
      await replaceData(() => applyImport(plan))
      const ok = t('settings.import.ok', plan.incoming)
      setMsg(plan.dropped ? `${ok} ${t('settings.import.dropped', { n: plan.dropped })}` : ok)
    } catch (e) {
      setMsg(t(e instanceof ImportError ? `settings.import.err.${e.reason}` : 'settings.import.err.write'))
      if (!(e instanceof ImportError)) throw e
    }
  })
  const wipe = async () => {
    if (!confirm(t('settings.danger.confirm'))) return
    await wipeAll(() => setMsg(t('settings.danger.blocked')))
  }
  const startEdit = () => {
    setDraft({})
    setEditing(true)
  }
  const saveEdit = async () => {
    if (!draft.role || !draft.config) return
    const changed = draft.role !== settings.role || draft.config !== settings.config
    // the pair lead belongs to the pair: a new role or configuration starts without it
    await update({ role: draft.role, config: draft.config, ...(changed ? { friendToday: false } : {}) })
    setEditing(false)
  }

  return (
    <>
      <h1>{t('settings.title')}</h1>
      <div className="card">
        <div className="field">
          <label>{t('settings.lang')}</label>
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
            {THEMES.map((x) => (
              <button
                key={x}
                className={`chip ${settings.theme === x ? 'on' : ''}`}
                onClick={() => update({ theme: x })}
              >
                {t(`settings.theme.${x}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!editing ? (
        <div className="card">
          <div className="small muted">{t('settings.role')}</div>
          <div>
            <strong>{t(`onboarding.role.${settings.role}`)}</strong>{' '}
            <span className="small">— {t(`role.help.${settings.role}`)}</span>
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            {t('settings.config')}
          </div>
          <div>
            <strong>{t(`onboarding.config.${settings.config}`)}</strong>{' '}
            <span className="small">— {t(configHelpKey(settings.role, settings.config))}</span>
          </div>
          {issue && <p className="notice small">{t(`combo.${issue}`)}</p>}
          <button className="btn sm" onClick={startEdit}>
            {t('settings.change')}
          </button>
        </div>
      ) : (
        <>
          <RoleConfigPicker role={draft.role} config={draft.config} onChange={setDraft} />
          <div className="row" style={{ margin: '8px 0 16px' }}>
            <button className="btn primary" onClick={saveEdit} disabled={!draft.role || !draft.config}>
              {t('settings.saveChoice')}
            </button>
            <button className="btn ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="sd">{t(startDateKey(settings))}</label>
          <DateField id="sd" value={settings.startDate ?? ''} onChange={(v) => update({ startDate: v || undefined })} />
        </div>
        <div className="field">
          <label htmlFor="cd">{t('onboarding.cadence')}</label>
          <Stepper id="cd" min={7} max={42} value={settings.cadenceDays} onChange={(v) => update({ cadenceDays: v })} />
          {settings.cadenceDays < 14 && <p className="small notice">{t('onboarding.cadence.help')}</p>}
        </div>
        {settings.role !== 'friend' && (
          <label className="row" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              key={String(settings.paperMode)}
              defaultChecked={settings.paperMode}
              onChange={(e) => update({ paperMode: e.target.checked })}
            />{' '}
            {t('onboarding.paper')}
          </label>
        )}
      </div>
      <div className="card">
        <div className="small muted">{t('settings.backup')}</div>
        <p className="small muted" style={{ marginTop: 2 }}>
          {t('settings.privacy')}
        </p>
        <div>
          <button className="btn" onClick={() => doExport()} disabled={exporting}>
            {t('settings.export')}
          </button>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            {t('settings.export.help')}
          </p>
        </div>
        <div>
          <button className="btn" onClick={() => file.current?.click()} disabled={importing}>
            {t('settings.import')}
          </button>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            {t('settings.import.help')}
          </p>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = '' // picking the same file again must start a new import
              if (f) doImport(f)
            }}
          />
        </div>
        {msg && (
          <p className="small" role="status">
            {msg}
          </p>
        )}
      </div>
      <div className="card">
        <Link to="/sources">{t('settings.sources')}</Link>
      </div>
      <button className="btn ghost small" onClick={wipe}>
        {t('settings.danger')}
      </button>
    </>
  )
}
