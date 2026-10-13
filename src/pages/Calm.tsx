import DreamerOnly from '../components/DreamerOnly'
import SectionLinks from '../components/SectionLinks'
import { useT } from '../i18n'
import Profile from '../sections/calm/Profile'
import Journal from '../sections/calm/Journal'
import Rep from '../sections/calm/Rep'
import Wheel from '../sections/calm/Wheel'

const SECTIONS = ['profile', 'journal', 'rep', 'wheel'] as const

/** Module 5 (L): saboteurs and strengths, the catch-the-saboteur journal, the short attention exercise, the Wheel of Life. */
export default function CalmPage() {
  return (
    <DreamerOnly>
      <Calm />
    </DreamerOnly>
  )
}

function Calm() {
  const { t } = useT()
  return (
    <>
      <h1>{t('calm.title')}</h1>
      <p className="muted">{t('calm.intro')}</p>
      <div className="card soft">
        <SectionLinks items={SECTIONS.map((id) => ({ id, label: t(`calm.section.${id}`) }))} />
      </div>
      <Profile />
      <Journal />
      <Rep />
      <Wheel />
    </>
  )
}
