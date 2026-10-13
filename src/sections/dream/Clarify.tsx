import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { saveDreamWork, setRoute } from '../../db/dreams'
import { sheetPath } from '../../lib/paths'
import { CLARIFY_STEPS, ROUTE_SLOTS, type ClarifyStep, type Dream, type DreamWork } from '../../db/db'

/** Module 2 (C): the five clarify steps and the three routes to the dream. */
export default function Clarify({ dream, work }: { dream: Dream; work?: DreamWork }) {
  const { t } = useT()
  const setStep = (step: ClarifyStep, v: string) => saveDreamWork(dream.id!, { clarify: { [step]: v } })
  const routes = Array.from({ length: ROUTE_SLOTS }, (_, i) => work?.routes?.[i] ?? '')
  const filled = CLARIFY_STEPS.filter((s) => (work?.clarify?.[s] ?? '').trim()).length
  return (
    <>
      <SectionHead
        id="clarify"
        label={t('mydream.section.clarify')}
        title={t('mydream.clarify')}
        right={t('mydream.progress', { n: filled })}
      />
      <p className="muted small">{t('mydream.clarify.help')}</p>
      {CLARIFY_STEPS.map((s) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`step-${s}`}>
              <strong>{t(`clarify.${s}`)}</strong> — {t(`clarify.${s}.q`)}
            </label>
            <AutoText
              id={`step-${s}`}
              placeholder={t(`clarify.${s}.placeholder`)}
              value={work?.clarify?.[s] ?? ''}
              onSave={(v) => setStep(s, v)}
              multiline
            />
          </div>
        </div>
      ))}
      <h3>{t('mydream.routes')}</h3>
      <p className="muted small">{t('mydream.routes.help')}</p>
      <div className="card">
        {routes.map((r, i) => (
          <div className="field" key={i}>
            <label htmlFor={`route-${i}`}>{t('mydream.route', { n: i + 1 })}</label>
            <AutoText
              id={`route-${i}`}
              placeholder={t(`mydream.route.placeholder.${i + 1}`)}
              value={r}
              onSave={(v) => setRoute(dream.id!, i, v)}
            />
          </div>
        ))}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to={sheetPath('clarify', dream.id)}>{t('mydream.print')}</Link>
      </p>
    </>
  )
}
