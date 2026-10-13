import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { REGRET_AREAS, type RegretArea, type VisionDoc } from '../../db/db'

/** Module 7: the regret exercise over four areas and the Yes/No list (FR-44). */
export default function RegretYesNo({
  v,
  save,
}: {
  v: VisionDoc
  save: (patch: Partial<VisionDoc>) => Promise<unknown>
}) {
  const { t } = useT()
  return (
    <>
      <SectionHead id="regret" label={t('vision.section.regret')} title={t('regret.title')} />
      <p className="muted small">{t('regret.help')}</p>
      {REGRET_AREAS.map((a: RegretArea) => (
        <div className="card" key={a}>
          <div className="field">
            <label htmlFor={`regret-${a}`}>
              <strong>{t(`regret.${a}`)}</strong> — {t('regret.q')}
            </label>
            <AutoText
              id={`regret-${a}`}
              placeholder={t(`regret.${a}.placeholder`)}
              style={{ minHeight: 72 }}
              value={v.regret?.[a] ?? ''}
              onSave={(v) => save({ regret: { [a]: v } })}
              multiline
            />
          </div>
        </div>
      ))}
      <h3>{t('yesno.title')}</h3>
      <p className="muted small">{t('yesno.help')}</p>
      <div className="card">
        {(['yes', 'no', 'changes', 'hardest'] as const).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`yn-${k}`}>
              <strong>{t(`yesno.${k}`)}</strong>
            </label>
            <AutoText
              id={`yn-${k}`}
              placeholder={t(`yesno.${k}.placeholder`)}
              style={{ minHeight: 72 }}
              value={v.yesno?.[k] ?? ''}
              onSave={(v) => save({ yesno: { [k]: v } })}
              multiline
            />
          </div>
        ))}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/regret">{t('regret.print')}</Link>
      </p>
    </>
  )
}
