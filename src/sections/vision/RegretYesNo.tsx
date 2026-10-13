import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { saveVision } from '../../db/vision'
import { REGRET_AREAS, type RegretArea, type VisionDoc } from '../../db/db'

/** Module 7: the regret exercise over four areas and the Yes/No list (FR-44). */
export default function RegretYesNo({ v }: { v: VisionDoc }) {
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
              onSave={(text) => saveVision({ regret: { [a]: text } })}
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
              onSave={(text) => saveVision({ yesno: { [k]: text } })}
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
