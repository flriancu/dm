import { useT, contentLocaleFor } from '../i18n'
import { loadDoc } from '../content/loader'
import { useContent } from '../content/useContent'

export default function Sources() {
  const { t, locale } = useT()
  const lang = contentLocaleFor(locale)
  const doc = useContent(`sources:${lang}`, () => loadDoc(lang, 'pages', 'surse'))
  return (
    <article className="content" lang={lang}>
      <h1>{t('sources.title')}</h1>
      <div dangerouslySetInnerHTML={{ __html: doc?.html ?? '' }} />
    </article>
  )
}
