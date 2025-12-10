import React from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, ShieldOff } from 'lucide-react'

export default function RegulatorToggle({ enabled, onChange, className = '' }) {
  const { i18n } = useTranslation('pages')
  const isArabic = i18n.language === 'ar'
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border shadow-sm transition ${
        enabled
          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      } ${className}`}
    >
      {enabled ? (
        <>
          <ShieldCheck className="w-4 h-4" />
          {isArabic ? 'واجهة المنظّم: تشغيل' : 'Regulator view: ON'}
        </>
      ) : (
        <>
          <ShieldOff className="w-4 h-4 text-gray-500" />
          {isArabic ? 'واجهة المنظّم: إيقاف' : 'Regulator view: OFF'}
        </>
      )}
    </button>
  )
}