import { useState } from 'react'
import DreamerOnly from '../components/DreamerOnly'
import SectionLinks from '../components/SectionLinks'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useChosenDream, useDream, useWorkOf } from '../db/dreams'
import Clarify from '../sections/dream/Clarify'
import Woop from '../sections/dream/Woop'
import Habit from '../sections/dream/Habit'
import Friends from '../sections/dream/Friends'
import Fear from '../sections/dream/Fear'
import LetGo from '../sections/dream/LetGo'

const SECTIONS = ['clarify', 'woop', 'habit', 'friends', 'fear', 'letgo'] as const

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
  const chosen = useChosenDream()
  // A dream released or achieved while this page is open stays on it (with the letting-go
  // note) until the learner leaves; a later visit shows the chosen dream, or none.
  const [shownId, setShownId] = useState<number | null>(null)
  if (chosen?.id != null && chosen.id !== shownId) setShownId(chosen.id)
  // subscribed all along, so the dream is already loaded when it stops being the chosen one (no flash, no remount)
  const kept = useDream(shownId)
  const dream = chosen ?? kept
  const work = useWorkOf(dream?.id)

  // wait for this dream's own worksheets: the boxes must not start from another dream's text
  if (chosen === undefined || dream === undefined || (dream && work === undefined)) return <p className="muted">…</p>
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

  // keyed by dream: a change of dream remounts the boxes, so text typed for one dream is saved to it, never to the next
  return (
    <>
      <h1>{t('mydream.title')}</h1>
      <div className="card soft">
        <div className="small muted">{t('home.chosen')}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 650, marginTop: 2 }}>{dream.text}</div>
        <SectionLinks items={SECTIONS.map((id) => ({ id, label: t(`mydream.section.${id}`) }))} />
      </div>
      <Clarify key={`c${dream.id}`} dream={dream} work={work ?? undefined} />
      <Woop key={`w${dream.id}`} dream={dream} work={work ?? undefined} />
      <Habit key={`h${dream.id}`} dream={dream} work={work ?? undefined} />
      <Friends key={`f${dream.id}`} dream={dream} work={work ?? undefined} />
      <Fear key={`x${dream.id}`} dream={dream} work={work ?? undefined} />
      <LetGo key={`l${dream.id}`} dream={dream} work={work ?? undefined} />
    </>
  )
}
