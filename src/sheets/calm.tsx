/** Printable sheets: each `.sheet` section prints on its own A4 page. */
import { useT } from '../i18n'
import { useSettings } from '../state/settings'
import { WHEEL_AREAS, SWLS_ITEMS } from '../db/db'
import { useLastWheel } from '../db/calm'
import { WheelSvg } from '../components/WheelSvg'

export function ProfileSheet() {
  const { t } = useT()
  const { settings } = useSettings()
  const strengths = [...settings.strengths, '', '', '', '', ''].slice(0, 5)
  return (
    <section className="sheet">
      <h1>{t('book.sheet.profile')}</h1>
      <h3>{t('profile.saboteurs')}</h3>
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <p style={{ margin: '4px 0 0' }}>
            {i + 1}. {settings.saboteurs[i] ? t(`sab.${settings.saboteurs[i]}`) : ''}
          </p>
          <div className="lines" />
        </div>
      ))}
      <h3>{t('profile.strengths')}</h3>
      {strengths.map((x, i) => (
        <div key={i}>
          <p style={{ margin: '4px 0 0' }}>
            {i + 1}. {x}
          </p>
          <div className="lines" />
        </div>
      ))}
      <h3>{t('profile.uses')}</h3>
      <table>
        <thead>
          <tr>
            <th style={{ width: '3em' }}>{t('book.col.n')}</th>
            <th style={{ width: '30%' }}>{t('profile.uses.which')}</th>
            <th>{t('profile.uses.what')}</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <tr key={i}>
              <td>{i}</td>
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function JournalSheet() {
  const { t } = useT()
  const rows = ['happened', 'thought', 'felt', 'did', 'saboteur', 'friend'] as const
  return (
    <>
      {[1, 2].map((k) => (
        <section className="sheet" key={k}>
          <h1>{t('book.sheet.journal')}</h1>
          <p>{t('journal.help')}</p>
          {[1, 2].map((e) => (
            <table key={e} style={{ marginBottom: '6mm' }}>
              <tbody>
                {rows.map((r) => (
                  <tr key={r}>
                    <th style={{ width: '32%' }}>{t(`journal.${r}`)}</th>
                    <td>
                      <div style={{ minHeight: '11mm' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </section>
      ))}
    </>
  )
}

export function WheelSheet() {
  const { t, fmtDate } = useT()
  const last = useLastWheel()
  const values = last?.values ?? Array(WHEEL_AREAS.length).fill(0)
  return (
    <section className="sheet">
      <h1>{t('book.sheet.wheel')}</h1>
      <p>
        {t('wheel.help')}
        {last ? ` · ${fmtDate(last.date)}` : ''}
      </p>
      <WheelSvg values={values} size={300} />
      <table>
        <tbody>
          {WHEEL_AREAS.map((a, i) => (
            <tr key={a}>
              <th style={{ width: '50%' }}>{t(`wheel.area.${a}`)}</th>
              <td>{last ? values[i] : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{t('swls.title')}</h3>
      <p>{t('swls.scale')}</p>
      <table>
        <tbody>
          {SWLS_ITEMS.map((k, i) => (
            <tr key={k}>
              <th style={{ width: '70%', fontWeight: 400 }}>{t(`swls.${k}`)}</th>
              <td>{last ? last.swls[i] : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
