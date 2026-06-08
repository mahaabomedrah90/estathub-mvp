import React from 'react'
import { ArrowRight } from 'lucide-react'

export default function SecondaryButton({
  children,
  className = '',
  icon: Icon,
  showArrow = false,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 px-6 py-3
        text-base font-medium text-brand-primary
        bg-surface-card border border-border-soft rounded-xl
        hover:bg-surface-muted hover:border-brand-accent/30
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:ring-offset-2
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
      {showArrow && <ArrowRight className="w-4 h-4" />}
    </button>
  )
}
