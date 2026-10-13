import { useT } from '../i18n'
import { dismissSaveError, useSaveError } from '../state/saveErrors'

/** Says, once, that the browser refused the last save, and what to do about it. */
export default function SaveErrorBanner() {
  const { t } = useT()
  const failure = useSaveError()
  if (!failure) return null
  return (
    <div className="notice save-error" role="alert">
      <strong>{t('save.failed')}</strong> {t(`save.failed.${failure}`)}{' '}
      <button className="btn sm ghost" onClick={dismissSaveError}>
        {t('save.dismiss')}
      </button>
    </div>
  )
}
