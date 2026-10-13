import DreamerOnly from '../components/DreamerOnly'
import SectionLinks from '../components/SectionLinks'
import { useT } from '../i18n'
import { emptyVision, useVision } from '../db/vision'
import Values from '../sections/vision/Values'
import Letter from '../sections/vision/Letter'
import Worksheet from '../sections/vision/Worksheet'
import RegretYesNo from '../sections/vision/RegretYesNo'
import Checkin from '../sections/vision/Checkin'
import Retro from '../sections/vision/Retro'

const SECTIONS = ['values', 'letter', 'sheet', 'regret', 'checkin', 'retro'] as const

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
  const stored = useVision()
  // wait for the stored document: an empty one shown first would flash the unsealed letter editor
  if (stored === undefined) return <p className="muted">…</p>
  const v = stored ?? emptyVision()
  return (
    <>
      <h1>{t('vision.title')}</h1>
      <p className="muted">{t('vision.intro')}</p>
      <div className="card soft">
        <SectionLinks items={SECTIONS.map((id) => ({ id, label: t(`vision.section.${id}`) }))} />
      </div>
      <Values v={v} />
      <Letter v={v} />
      <Worksheet v={v} />
      <RegretYesNo v={v} />
      <Checkin v={v} />
      <Retro v={v} />
    </>
  )
}
