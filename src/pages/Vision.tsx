import DreamerOnly from '../components/DreamerOnly'
import { useT } from '../i18n'
import { emptyVision, useVision, saveVision } from '../db/vision'
import Values from '../sections/vision/Values'
import Letter from '../sections/vision/Letter'
import Worksheet from '../sections/vision/Worksheet'
import RegretYesNo from '../sections/vision/RegretYesNo'
import Checkin from '../sections/vision/Checkin'
import Retro from '../sections/vision/Retro'

/** Modules 6–7: values, the letter from the future self, the vision worksheet, regret and Yes/No, the check-in, the retrospective. */
export default function VisionPage() {
  return (
    <DreamerOnly>
      <Vision />
    </DreamerOnly>
  )
}

function Vision() {
  const { t } = useT()
  const v = useVision() ?? emptyVision()
  return (
    <>
      <h1>{t('vision.title')}</h1>
      <p className="muted">{t('vision.intro')}</p>
      <div className="card soft">
        <div className="row small" style={{ gap: '4px 12px' }}>
          <a href="#values">{t('vision.section.values')}</a>
          <a href="#letter">{t('vision.section.letter')}</a>
          <a href="#sheet">{t('vision.section.sheet')}</a>
          <a href="#regret">{t('vision.section.regret')}</a>
          <a href="#checkin">{t('vision.section.checkin')}</a>
          <a href="#retro">{t('vision.section.retro')}</a>
        </div>
      </div>
      <Values v={v} save={saveVision} />
      <Letter v={v} save={saveVision} />
      <Worksheet v={v} save={saveVision} />
      <RegretYesNo v={v} save={saveVision} />
      <Checkin v={v} save={saveVision} />
      <Retro v={v} save={saveVision} />
    </>
  )
}
