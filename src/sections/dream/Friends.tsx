import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { setFriend } from '../../db/dreams'
import { sheetPath } from '../../lib/paths'
import { FRIEND_ROLES, FRIEND_SLOTS, type DreamFriend, type Dream, type DreamWork } from '../../db/db'

/** Module 4 (I): the three people around the dream and what is asked of each (FR-23). */
export default function Friends({ dream, work }: { dream: Dream; work?: DreamWork }) {
  const { t } = useT()
  const friends: DreamFriend[] = Array.from({ length: FRIEND_SLOTS }, (_, i) => work?.friends?.[i] ?? {})
  const set = (i: number, p: Partial<DreamFriend>) => setFriend(dream.id!, i, p)
  return (
    <>
      <SectionHead id="friends" label={t('mydream.section.friends')} title={t('friends.title')} />
      <p className="muted small">{t('friends.help')}</p>
      {friends.map((f, i) => (
        <div className="card" key={i}>
          <div className="field">
            <label htmlFor={`friend-name-${i}`}>{t('friends.name', { n: i + 1 })}</label>
            <AutoText
              id={`friend-name-${i}`}
              placeholder={t('friends.name.placeholder')}
              value={f.name ?? ''}
              onSave={(v) => set(i, { name: v })}
            />
          </div>
          <div className="field">
            <label>{t('friends.role')}</label>
            <div className="row">
              {FRIEND_ROLES.map((r) => (
                <button
                  key={r}
                  className={`chip ${f.role === r ? 'on' : ''}`}
                  aria-pressed={f.role === r}
                  onClick={() => set(i, { role: r })}
                >
                  {t(`friends.role.${r}`)}
                </button>
              ))}
            </div>
            {f.role && <p className="small muted">{t(`friends.role.${f.role}.help`)}</p>}
          </div>
          {f.role === 'ask' && (
            <div className="field">
              <label htmlFor={`friend-ask-${i}`}>{t('friends.ask')}</label>
              <AutoText
                id={`friend-ask-${i}`}
                placeholder={t('friends.ask.placeholder')}
                value={f.ask ?? ''}
                onSave={(v) => set(i, { ask: v })}
                multiline
              />
            </div>
          )}
          {f.role === 'progress' && (
            <div className="field">
              <label htmlFor={`friend-day-${i}`}>{t('friends.day')}</label>
              <AutoText
                id={`friend-day-${i}`}
                placeholder={t('friends.day.placeholder')}
                value={f.day ?? ''}
                onSave={(v) => set(i, { day: v })}
              />
            </div>
          )}
        </div>
      ))}
      <p className="small muted">
        {t('friends.note')} <Link to={sheetPath('friends', dream.id)}>{t('friends.print')}</Link>
      </p>
    </>
  )
}
