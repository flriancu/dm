import { useT } from '../i18n'
import type { Role, Config } from '../db/db'
import { CONFIGS_FOR_ROLE } from '../state/combos'

/**
 * Stepped chooser for role and configuration (FR-06, FR-07).
 * Step 1 shows the roles only. Once a role is picked, step 2 shows only the
 * configurations that make sense for it. Nothing further is shown until both are set.
 */
export default function RoleConfigPicker({ role, config, onChange }: {
  role?: Role
  config?: Config
  onChange: (next: { role?: Role; config?: Config }) => void
}) {
  const { t } = useT()
  const roles: Role[] = ['dreamer', 'friend', 'both']
  const configs = role ? CONFIGS_FOR_ROLE[role] : []
  return (
    <>
      <div className="card">
        <div className="field">
          <label>{t('picker.step1')}</label>
          <div className="row">
            {roles.map((r) => (
              <button key={r} className={`chip ${role === r ? 'on' : ''}`} onClick={() => onChange({ role: r, config: undefined })}>{t(`onboarding.role.${r}`)}</button>
            ))}
          </div>
          {role ? <p className="small" style={{ margin: '4px 0 0' }}>{t(`role.help.${role}`)}</p> : <p className="small muted" style={{ margin: '4px 0 0' }}>{t('picker.pickRole')}</p>}
        </div>
      </div>
      {role && (
        <div className="card">
          <div className="field">
            <label>{t('picker.step2')}</label>
            <div className="row">
              {configs.map((c) => (
                <button key={c} className={`chip ${config === c ? 'on' : ''}`} onClick={() => onChange({ role, config: c })}>{t(`onboarding.config.${c}`)}</button>
              ))}
            </div>
            {config ? <p className="small" style={{ margin: '4px 0 0' }}>{t(`config.help.${config}`)}</p> : <p className="small muted" style={{ margin: '4px 0 0' }}>{t(`picker.pickConfig.${role}`)}</p>}
          </div>
        </div>
      )}
    </>
  )
}
