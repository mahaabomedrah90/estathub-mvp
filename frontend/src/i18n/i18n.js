import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './en/common.json'
import enSidebar from './en/sidebar.json'
import enNavbar from './en/navbar.json'
import enPages from './en/pages.json'
import enBlockchain from './en/blockchain.json'
import enProperty from './en/property.json'

import arCommon from './ar/common.json'
import arSidebar from './ar/sidebar.json'
import arNavbar from './ar/navbar.json'
import arPages from './ar/pages.json'
import arBlockchain from './ar/blockchain.json'
import arProperty from './ar/property.json'

const resources = {
  en: {
    common: enCommon,
    sidebar: enSidebar,
    navbar: enNavbar,
    pages: enPages,
    blockchain: enBlockchain,
    property: enProperty,
  },
  ar: {
    common: arCommon,
    sidebar: arSidebar,
    navbar: arNavbar,
    pages: arPages,
    blockchain: arBlockchain,
    property: arProperty,
  },
}

function detectInitialLanguage() {
  if (typeof window === 'undefined') return 'en'

  const stored = localStorage.getItem('estathub_lang') || localStorage.getItem('i18nextLng')
  if (stored === 'en' || stored === 'ar') return stored

  const browser = navigator.language || (navigator.languages && navigator.languages[0]) || 'en'
  return browser.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

function updateHtmlDirection(lang) {
  if (typeof document === 'undefined') return
  const dir = i18n.dir(lang)
  const html = document.documentElement

  html.setAttribute('lang', lang)
  html.setAttribute('dir', dir)
}

const initialLang = detectInitialLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    defaultNS: 'common',
    ns: ['common', 'sidebar', 'navbar', 'pages', 'blockchain', 'property'],
    interpolation: {
      escapeValue: false,
    },
  })
  .then(() => {
    updateHtmlDirection(i18n.language)
  })

i18n.on('languageChanged', (lng) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('estathub_lang', lng)
    }
  } catch {
    // ignore
  }
  updateHtmlDirection(lng)
})

export default i18n