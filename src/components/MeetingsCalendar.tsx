import { useT } from '../i18n'
import { useSettings } from '../state/settings'
import { useModules } from '../content/useContent'
import { meetingDates } from '../lib/course'
import { calendarIcs } from '../lib/ics'
import { downloadText } from '../lib/files'

/**
 * One calendar file with every meeting date (module 1 onwards), computed from the first
 * meeting and the days between modules. Shown only once a first-meeting date is set.
 */
export default function MeetingsCalendar() {
  const { t } = useT()
  const { settings } = useSettings()
  const modules = useModules()
  const dates = modules ? meetingDates(modules, settings.startDate, settings.cadenceDays) : []
  if (!dates.length) return null

  const download = () =>
    downloadText(
      'intalnirile-cartea-visurilor.ics',
      calendarIcs(
        dates.map(({ module: m, date }) => ({
          date,
          uid: `meeting-${m.id}`,
          title: t('calendar.meeting.title', { n: m.order, title: m.title }),
          body: t('calendar.meeting.body', { n: m.order }),
        })),
      ),
    )

  return (
    <div className="field">
      <div>
        <button type="button" className="btn sm" onClick={download}>
          {t('calendar.meetings')}
        </button>
      </div>
      <p className="small muted">{t('calendar.meetings.help', { n: dates.length })}</p>
    </div>
  )
}
