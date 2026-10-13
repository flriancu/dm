import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { saveDreamWork, releaseDream } from '../../db/dreams'
import { today, type Dream, type DreamWork } from '../../db/db'

/** Letting go (FR-46): the signs, costs and benefits, and the continue/release decision. */
const LETGO_SIGNS = ['oscillate', 'sleep', 'stalled', 'outside'] as const

export default function LetGo({ dream, work }: { dream: Dream; work?: DreamWork }) {
  const { t, fmtDate } = useT()
  const save = (patch: Partial<DreamWork>) => saveDreamWork(dream.id!, patch)
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
                key={`${s}-${(work?.letgo?.signs ?? []).includes(s) ? 1 : 0}`}
                defaultChecked={(work?.letgo?.signs ?? []).includes(s)}
                onChange={(e) => {
                  const cur = work?.letgo?.signs ?? []
                  save({ letgo: { signs: e.target.checked ? [...cur, s] : cur.filter((x) => x !== s) } })
                }}
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
              onSave={(v) => save({ letgo: { [k]: v } })}
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
              <button className="btn" onClick={() => save({ letgo: { decision: 'continue', decided: today() } })}>
                {t('letgo.continue')}
              </button>
              <button
                className="btn ghost"
                onClick={async () => {
                  await save({ letgo: { decision: 'release', decided: today() } })
                  await releaseDream(dream)
                }}
              >
                {t('letgo.release')}
              </button>
            </div>
          </>
        )}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/letgo">{t('letgo.print')}</Link>
      </p>
    </>
  )
}
