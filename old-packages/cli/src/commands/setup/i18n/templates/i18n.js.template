import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr.json'
import en from './locales/en.json'

// This is a simple i18n configuration with English and French translations.
// You can find the translations in web/src/locales/{language}.json
// see: https://react.i18next.com
// Here's an example of how to use it in your components, pages or layouts:
/*
import { Link, routes } from '@redwoodjs/router'
import { useTranslation } from 'react-i18next'

const HomePage = () => {
  const { t, i18n } = useTranslation()
  return (
    <>
      <h1>{t('HomePage.title')}</h1>
      <button onClick={() => i18n.changeLanguage('fr')}>fr</button>
      <button onClick={() => i18n.changeLanguage('en')}>en</button>
      <p>
        {t('HomePage.info')} <code>./web/src/pages/HomePage/HomePage.js</code>
      </p>
      <p>
        {t('HomePage.route')} <code>home</code>, {t('HomePage.link')}`
        <Link to={routes.home()}>Home</Link>`
      </p>
    </>
  )
}

export default HomePage
*/

i18n
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    interpolation: { escapeValue: false }, // React already does escaping
    fallbackLng: 'en',
    resources: {
      en: {
        translation: en,
      },
      fr: {
        translation: fr,
      },
    },
  })
export default i18n
