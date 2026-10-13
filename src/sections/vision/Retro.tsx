import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { saveVision } from '../../db/vision'
import { useModuleNotes } from '../../db/notes'
import { TEXT_WORD, type VisionDoc } from '../../db/db'

/** Module 7 retrospective: the one word per module collected along the course, and four closing questions. */
export default function Retro({ v }: { v: VisionDoc }) {
  const { t } = useT()
  const notes = useModuleNotes() ?? []
  return (
    <>
      <SectionHead id="retro" label={t('vision.section.retro')} title={t('retro.title')} />
      <p className="muted small">{t('retro.help')}</p>
      <div className="card">
        <div className="small muted">{t('retro.words')}</div>
        {notes.filter((n) => n.oneWord).length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            {t('retro.words.none')}
          </p>
        ) : (
          <ul className="list small">
            {notes
              .filter((n) => n.oneWord)
              .map((n) => (
                <li key={n.moduleId}>
                  {t('home.module')} {Number(n.moduleId)}: <strong>{n.oneWord}</strong>
                  {n.takeaways ? <span className="muted"> — {n.takeaways}</span> : null}
                </li>
              ))}
          </ul>
        )}
      </div>
      <div className="card">
        {(['tool', 'habit', 'aha', 'word'] as const).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`retro-${k}`}>
              <strong>{t(`retro.${k}`)}</strong>
            </label>
            {k === 'word' ? (
              <AutoText
                id={`retro-${k}`}
                maxLength={TEXT_WORD}
                placeholder={t(`retro.${k}.placeholder`)}
                value={v.retro?.[k] ?? ''}
                onSave={(text) => saveVision({ retro: { [k]: text } })}
              />
            ) : (
              <AutoText
                id={`retro-${k}`}
                placeholder={t(`retro.${k}.placeholder`)}
                style={{ minHeight: 72 }}
                value={v.retro?.[k] ?? ''}
                onSave={(text) => saveVision({ retro: { [k]: text } })}
                multiline
              />
            )}
          </div>
        ))}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/retro">{t('retro.print')}</Link>
      </p>
    </>
  )
}
