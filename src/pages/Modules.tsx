import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT, contentLocaleFor } from '../i18n'
import { listModules, type ModuleMeta } from '../content/loader'

export default function Modules() {
  const { t, locale } = useT()
  const [modules, setModules] = useState<ModuleMeta[]>([])
  useEffect(() => { listModules(contentLocaleFor(locale)).then(setModules) }, [locale])
  return (
    <>
      <h1>{t('modules.title')}</h1>
      <p className="muted small">{t('modules.locked.none')}</p>
      <ul className="list">
        {modules.map((m) => (
          <li key={m.id}>
            <Link to={`/module/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>{m.order}. {m.title}</strong>{m.letter ? <span className="chip small" style={{ marginLeft: 8 }} title={t('letter.label')}>{m.letter.split('').map((l) => `${l} · ${t(`letter.${l}`)}`).join(', ')}</span> : null}
              <div className="small muted">{m.subtitle}</div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
