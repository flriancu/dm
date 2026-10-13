import DreamerOnly from '../components/DreamerOnly'
import { useT } from '../i18n'
import Profile from '../sections/calm/Profile'
import Journal from '../sections/calm/Journal'
import Rep from '../sections/calm/Rep'
import Wheel from '../sections/calm/Wheel'

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
        <div className="row small" style={{ gap: '4px 12px' }}>
          <a href="#profile">{t('calm.section.profile')}</a>
          <a href="#journal">{t('calm.section.journal')}</a>
          <a href="#rep">{t('calm.section.rep')}</a>
          <a href="#wheel">{t('calm.section.wheel')}</a>
        </div>
      </div>
      <Profile />
      <Journal />
      <Rep />
      <Wheel />
    </>
  )
}
