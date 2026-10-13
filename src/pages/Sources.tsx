import { useEffect, useState } from 'react'
import { useT, contentLocaleFor } from '../i18n'
import { loadDoc } from '../content/loader'

export default function Sources() {
  const { t, locale } = useT()
  const [doc, setDoc] = useState<{ html: string } | null>(null)
  useEffect(() => { loadDoc(contentLocaleFor(locale), 'pages', 'surse').then(setDoc) }, [locale])
  return (
    <article className="content" lang="ro">
      <h1>{t('sources.title')}</h1>
      <div dangerouslySetInnerHTML={{ __html: doc?.html ?? '' }} />
    </article>
  )
}
