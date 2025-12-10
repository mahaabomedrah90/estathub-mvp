import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, Mail, Phone, MapPin, Twitter, Linkedin, Github } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation('common')

  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-500" size={28} />
              <span className="text-white font-bold text-xl">{t('appName')}</span>
            </div>
            <p className="text-sm text-gray-400">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-3">
              {/* same social icons */}
              <a href="#" className="text-gray-400 hover:text-emerald-500 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-500 transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-500 transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-emerald-500 transition-colors">
                  {t('footer.links.home')}
                </Link>
              </li>
              <li>
                <Link to="/opportunities" className="hover:text-emerald-500 transition-colors">
                  {t('footer.links.opportunities')}
                </Link>
              </li>
              <li>
                <Link to="/wallet" className="hover:text-emerald-500 transition-colors">
                  {t('footer.links.wallet')}
                </Link>
              </li>
              <li>
                <Link to="/blockchain" className="hover:text-emerald-500 transition-colors">
                  {t('footer.links.blockchainExplorer')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.resources')}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.links.about')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.links.howItWorks')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.links.faq')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.links.terms')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('footer.links.privacy')}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.contactUs')}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <span>{t('footer.location')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="flex-shrink-0" />
                <a href="mailto:info@estathub.sa" className="hover:text-emerald-500 transition-colors">
                  info@estathub.sa
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="flex-shrink-0" />
                <a href="tel:+966123456789" className="hover:text-emerald-500 transition-colors">
                  +966 12 345 6789
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center text-gray-400">
          <p>© {new Date().getFullYear()} {t('appName')}. {t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}