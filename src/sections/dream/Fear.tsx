import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { saveDreamWork } from '../../db/dreams'
import type { Dream, DreamWork } from '../../db/db'

/** Module 4: the fear behind the dream and what "good enough" looks like (FR-35). */
export default function Fear({ dream, work }: { dream: Dream; work?: DreamWork }) {
  const { t } = useT()
  const setFear = (k: 'fear' | 'goodEnough', v: string) => saveDreamWork(dream.id!, { fear: { [k]: v } })
  return (
    <>
      <SectionHead id="fear" label={t('mydream.section.fear')} title={t('fear.title')} />
      <p className="muted small">{t('fear.help')}</p>
      <div className="card">
        <div className="field">
          <label htmlFor="fear-fear">
            <strong>{t('fear.fear')}</strong> — {t('fear.fear.q')}
          </label>
          <AutoText
            id="fear-fear"
            placeholder={t('fear.fear.placeholder')}
            value={work?.fear?.fear ?? ''}
            onSave={(v) => setFear('fear', v)}
            multiline
          />
        </div>
        <div className="field">
          <label htmlFor="fear-good">
            <strong>{t('fear.goodEnough')}</strong> — {t('fear.goodEnough.q')}
          </label>
          <AutoText
            id="fear-good"
            placeholder={t('fear.goodEnough.placeholder')}
            value={work?.fear?.goodEnough ?? ''}
            onSave={(v) => setFear('goodEnough', v)}
            multiline
          />
        </div>
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/fear">{t('fear.print')}</Link>
      </p>
    </>
  )
}
