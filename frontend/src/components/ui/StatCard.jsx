import React from 'react'

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        bg-surface-card border border-border-soft rounded-xl p-6
        shadow-card transition-all duration-300
        hover:shadow-md
        ${className}
      `}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-text-muted uppercase tracking-wide">
          {title}
        </div>
        {Icon && (
          <div className="w-10 h-10 bg-brand-accent/10 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-brand-accent" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-2xl font-bold text-brand-primary mb-1">
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-sm text-text-muted">
          {subtitle}
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className={`text-sm font-medium mt-2 ${
          trend.positive ? 'text-brand-accent' : 'text-red-600'
        }`}>
          {trend.value}
        </div>
      )}
    </div>
  )
}
