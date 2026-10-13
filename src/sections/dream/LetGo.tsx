import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { saveDreamWork, setLetgoSign, decideLetgo } from '../../db/dreams'
import { useAction } from '../../state/useAction'
import { sheetPath } from '../../lib/paths'
import { LETGO_SIGNS, type Dream, type DreamWork } from '../../db/db'

/** Letting go (FR-46): the signs, costs and benefits, and the continue/release decision. */
export default function LetGo({ dream, work }: { dream: Dream; work?: DreamWork }) {
  const { t, fmtDate } = useT()
  const signs = work?.letgo?.signs ?? []
  const [decide, deciding] = useAction((d: 'continue' | 'release') => decideLetgo(dream, d))
  return (
    <>
      <SectionHead id="letgo" label={t('mydream.section.letgo')} title={t('letgo.title')} />
      <p className="muted small">{t('letgo.help')}</p>
      <div className="card">
        <div className="field">
          <label>{t('letgo.signs')}</label>
          {LETGO_SIGNS.map((s) => (
            <label key={s} className="row" style={{ minHeight: 32 }}>
              <input
                type="checkbox"
                key={`${s}-${signs.includes(s) ? 1 : 0}`}
                defaultChecked={signs.includes(s)}
                onChange={(e) => setLetgoSign(dream.id!, s, e.target.checked)}
              />
              <span>{t(`letgo.sign.${s}`)}</span>
            </label>
          ))}
        </div>
        {(['costs', 'benefits', 'replacement'] as const).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`letgo-${k}`}>{t(`letgo.${k}`)}</label>
            <AutoText
              id={`letgo-${k}`}
              placeholder={t(`letgo.${k}.placeholder`)}
              style={{ minHeight: 64 }}
              value={work?.letgo?.[k] ?? ''}
              onSave={(v) => saveDreamWork(dream.id!, { letgo: { [k]: v } })}
              multiline
            />
          </div>
        ))}
        {dream.dateReleased ? (
          <p className="notice small">
            {t('letgo.released', { date: fmtDate(dream.dateReleased) })} <Link to="/dreams">{t('dreams.title')} →</Link>
          </p>
        ) : (
          <>
            {work?.letgo?.decision === 'continue' && work.letgo.decided && (
              <p className="small muted">{t('letgo.continued', { date: fmtDate(work.letgo.decided) })}</p>
            )}
            <div className="row">
              <button className="btn" onClick={() => decide('continue')} disabled={deciding}>
                {t('letgo.continue')}
              </button>
              <button className="btn ghost" onClick={() => decide('release')} disabled={deciding}>
                {t('letgo.release')}
              </button>
            </div>
          </>
        )}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to={sheetPath('letgo', dream.id)}>{t('letgo.print')}</Link>
      </p>
    </>
  )
}
