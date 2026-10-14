import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import { fields } from '../../db/fields'
import SectionHead from '../../components/SectionHead'
import { sheetPath } from '../../lib/paths'
import { WOOP_STEPS, type Dream, type DreamWork } from '../../db/db'

/** Module 3 (O): the four WOOP steps (FR-21). */
export default function Woop({ dream, work }: { dream: Dream; work?: DreamWork }) {
  const { t } = useT()
  const woopFilled = WOOP_STEPS.filter((s) => (work?.woop?.[s] ?? '').trim()).length
  return (
    <>
      <SectionHead
        id="woop"
        label={t('mydream.section.woop')}
        title={t('woop.title')}
        right={t('woop.progress', { n: woopFilled })}
      />
      <p className="muted small">{t('woop.help')}</p>
      {WOOP_STEPS.map((s) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`woop-${s}`}>
              <strong>{t(`woop.${s}`)}</strong> — {t(`woop.${s}.q`)}
            </label>
            <AutoText
              id={`woop-${s}`}
              placeholder={t(`woop.${s}.placeholder`)}
              value={work?.woop?.[s] ?? ''}
              field={fields.dreamWork(dream.id!, 'woop', s)}
              multiline
            />
          </div>
        </div>
      ))}
      <p className="small muted">
        {t('mydream.saved')} <Link to={sheetPath('woop', dream.id)}>{t('woop.print')}</Link>
      </p>
    </>
  )
}
