import { useT } from '../i18n'
import { useSettings } from '../state/settings'
import { useAction } from '../state/useAction'
import { useModules } from '../content/useContent'
import { meetingDates } from '../lib/course'
import { calendarIcs } from '../lib/ics'
import { downloadText } from '../lib/files'
import { calendarUid } from '../db/settings'
import ErrorBoundary from './ErrorBoundary'

/**
 * One calendar file with every meeting date (module 1 onwards), computed from the first
 * meeting and the days between modules. Shown only once a first-meeting date is set, and only
 * when the course content can be loaded: it lives on pages (Settings, Home) that must keep
 * working without it, so a failed load hides the button instead of breaking the page.
 */
export default function MeetingsCalendar() {
  return (
    <ErrorBoundary fallback={() => null}>
      <Meetings />
    </ErrorBoundary>
  )
}

function Meetings() {
  const { t } = useT()
  const { settings } = useSettings()
  const modules = useModules()
  const dates = modules ? meetingDates(modules, settings.startDate, settings.cadenceDays) : []
  const [download, busy] = useAction(async () => {
    const events = await Promise.all(
      dates.map(async ({ module: m, date }) => ({
        date,
        uid: await calendarUid(`meeting-${m.id}`),
        title: t('calendar.meeting.title', { n: m.order, title: m.title }),
        body: t('calendar.meeting.body', { n: m.order }),
      })),
    )
    downloadText('intalnirile-cartea-visurilor.ics', calendarIcs(events))
  })
  if (!dates.length) return null

  return (
    <div className="field">
      <div>
        <button type="button" className="btn sm" onClick={() => download()} disabled={busy}>
          {t('calendar.meetings')}
        </button>
      </div>
      <p className="small muted">{t('calendar.meetings.help', { n: dates.length })}</p>
    </div>
  )
}
