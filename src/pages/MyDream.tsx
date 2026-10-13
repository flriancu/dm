import DreamerOnly from '../components/DreamerOnly'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useChosenOrReleasedDream, useWorkOf } from '../db/dreams'
import Clarify from '../sections/dream/Clarify'
import Woop from '../sections/dream/Woop'
import Habit from '../sections/dream/Habit'
import Friends from '../sections/dream/Friends'
import Fear from '../sections/dream/Fear'
import LetGo from '../sections/dream/LetGo'

/** The chosen dream's worksheets: module 2 (clarify, routes), 3 (WOOP), 4 (habit, friends, fear), and letting go (FR-46). */
export default function MyDreamPage() {
  return (
    <DreamerOnly>
      <MyDream />
    </DreamerOnly>
  )
}

function MyDream() {
  const { t } = useT()
  const dream = useChosenOrReleasedDream()
  const work = useWorkOf(dream?.id)

  if (dream === undefined) return <p className="muted">…</p>
  if (!dream) {
    return (
      <>
        <h1>{t('mydream.title')}</h1>
        <p className="notice">
          {t('mydream.none')} <Link to="/dreams">{t('nav.dreams')}</Link>
        </p>
      </>
    )
  }

  return (
    <>
      <h1>{t('mydream.title')}</h1>
      <div className="card soft">
        <div className="small muted">{t('home.chosen')}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 650, marginTop: 2 }}>{dream.text}</div>
        <div className="row small" style={{ gap: '4px 12px' }}>
          <a href="#clarify">{t('mydream.section.clarify')}</a>
          <a href="#woop">{t('mydream.section.woop')}</a>
          <a href="#habit">{t('mydream.section.habit')}</a>
          <a href="#friends">{t('mydream.section.friends')}</a>
          <a href="#fear">{t('mydream.section.fear')}</a>
          <a href="#letgo">{t('mydream.section.letgo')}</a>
        </div>
      </div>
      <Clarify dream={dream} work={work} />
      <Woop dream={dream} work={work} />
      <Habit dream={dream} work={work} />
      <Friends dream={dream} work={work} />
      <Fear dream={dream} work={work} />
      <LetGo dream={dream} work={work} />
    </>
  )
}
