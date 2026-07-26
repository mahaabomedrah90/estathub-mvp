import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, Mail, Phone, MapPin, Twitter, Linkedin, Github, Instagram, Music } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePublicPageVisibility } from '../hooks/usePublicPageVisibility'

export default function Footer() {
  const { t } = useTranslation('common')
  const { aboutPageEnabled, opportunitiesPageEnabled } = usePublicPageVisibility()

  return (
    <footer className="bg-brand-primary text-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-4">
            <div>
              <img 
                src="/Full Logo 3.png" 
                alt="ALWSM" 
                className="h-10 w-auto object-contain mb-6"
                onError={(e) => {
                  // Fallback to icon if image not found
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.innerHTML = '<div class="flex items-center gap-2"><svg class="text-brand-accent" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 0 0 .707-1.707l-9-9a.999.999 0 0 0-1.414 0l-9 9A1 1 0 0 0 3 13zm7 7v-5h4v5h-4zm2-15.586 6 6H15l.001 4H9v-4H6l6-6z"/></svg><span class="text-white font-bold text-xl">ALWSM</span></div>';
                  e.target.parentNode.replaceChild(fallback.firstElementChild, e.target);
                }}
              />
            </div>
            <p className="text-sm text-white/60">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-3">
              {/* Social media icons */}
              <a 
                href="https://x.com/Tryalwsmsa" 
                className="text-white/50 hover:text-brand-accent transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow ALWSM on X (Twitter)"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="https://www.instagram.com/Tryalwsmsa" 
                className="text-white/50 hover:text-brand-accent transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow ALWSM on Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://www.tiktok.com/@Tryalwsmsa" 
                className="text-white/50 hover:text-brand-accent transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow ALWSM on TikTok"
              >
                <Music size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-brand-accent transition-colors">
                  {t('footer.links.home')}
                </Link>
              </li>
              {opportunitiesPageEnabled && (
                <li>
                  <Link to="/opportunities" className="hover:text-brand-accent transition-colors">
                    {t('footer.links.opportunities')}
                  </Link>
                </li>
              )}
              <li>
                <Link to="/wallet" className="hover:text-brand-accent transition-colors">
                  {t('footer.links.wallet')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.resources')}</h3>
            <ul className="space-y-2 text-sm">
              {aboutPageEnabled && (
                <li>
                  <Link to="/about" className="hover:text-brand-accent transition-colors">
                    {t('footer.links.about')}
                  </Link>
                </li>
              )}
              <li>
                <Link to="/how-it-works" className="hover:text-brand-accent transition-colors">
                  {t('footer.links.howItWorks')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-brand-accent transition-colors">
                  {t('footer.links.faq')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.contactUs')}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <span>{t('footer.location')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="flex-shrink-0" />
                <a href="mailto:support@alwsm.sa" className="hover:text-brand-accent transition-colors">
                  support@alwsm.sa
                </a>
              </li>
                            <li className="flex items-center gap-2">
                <Phone size={16} className="flex-shrink-0" />
                <a href="tel:+966530103099" className="hover:text-brand-accent transition-colors">
                  +966 53 010 3099
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-6 pt-6 text-sm text-center text-white/40">
          <p> {new Date().getFullYear()} {t('appName')}. {t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
