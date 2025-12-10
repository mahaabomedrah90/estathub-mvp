import React from 'react'
import { Info } from 'lucide-react'

const toneStyles = {
  blue: 'bg-blue-50 text-blue-900 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-900 border-emerald-100',
  purple: 'bg-purple-50 text-purple-900 border-purple-100',
  amber: 'bg-amber-50 text-amber-900 border-amber-100',
  indigo: 'bg-indigo-50 text-indigo-900 border-indigo-100',
  cyan: 'bg-cyan-50 text-cyan-900 border-cyan-100',
  slate: 'bg-slate-50 text-slate-900 border-slate-100',
  rose: 'bg-rose-50 text-rose-900 border-rose-100'
}

export default function KpiCard({
  title,
  value,
  icon: Icon,
  tone = 'blue',
  tooltip
}) {
  const toneClass = toneStyles[tone] || toneStyles.blue

  return (
    <div
      className={`relative rounded-2xl border shadow-sm p-4 sm:p-5 flex items-start gap-3 ${toneClass}`}
    >
      <div className="mt-1 rounded-xl bg-white/70 text-gray-900 p-2 shadow-sm">
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </p>
          {tooltip && (
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="pointer-events-none absolute right-0 z-10 mt-1 hidden w-52 rounded-md bg-gray-900 px-2 py-1.5 text-[10px] text-gray-100 shadow-lg group-hover:block">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {typeof value === 'number'
              ? value.toLocaleString()
              : value || '0'}
          </span>
        </div>
      </div>
    </div>
  )
}