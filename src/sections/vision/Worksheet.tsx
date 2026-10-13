import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { VISION_SECTIONS, type VisionDoc } from '../../db/db'

/** Modules 6–7: the nine-part vision worksheet and the check on the vision statement (FR-42). */
export default function Worksheet({
  v,
  save,
}: {
  v: VisionDoc
  save: (patch: Partial<VisionDoc>) => Promise<unknown>
}) {
  const { t } = useT()
  return (
    <>
      <SectionHead id="sheet" label={t('vision.section.sheet')} title={t('sheet.title')} />
      <p className="muted small">{t('sheet.help')}</p>
      {VISION_SECTIONS.map((s, i) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`vs-${s}`}>
              <span className="chip small" style={{ marginRight: 6 }}>
                {t('home.module')} {i < 4 ? 6 : 7}
              </span>{' '}
              <strong>
                {i + 1}. {t(`sheet.${s}`)}
              </strong>{' '}
              — {t(`sheet.${s}.q`)}
            </label>
            <AutoText
              id={`vs-${s}`}
              placeholder={t(`sheet.${s}.placeholder`)}
              value={v.worksheet[s] ?? ''}
              onSave={(v) => save({ worksheet: { [s]: v } })}
              multiline
            />
          </div>
        </div>
      ))}
      {(v.worksheet.statement ?? '').trim() && (
        <div className="card soft">
          <div className="small muted">{t('sheet.check')}</div>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: '1.3rem' }}>
            {['mine', 'stretch', 'decide'].map((k) => (
              <li key={k}>{t(`sheet.check.${k}`)}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/sheet">{t('sheet.print')}</Link>
      </p>
    </>
  )
}
