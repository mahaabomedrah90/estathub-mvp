import React from 'react'

export default function SectionCard({
  children,
  className = '',
  padding = 'lg',
  hover = false,
  ...props
}) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  return (
    <div
      className={`
        bg-surface-card border border-border-soft rounded-2xl
        shadow-card transition-all duration-300
        ${hover ? 'hover:shadow-lg hover:-translate-y-1' : ''}
        ${paddingClasses[padding] || paddingClasses.lg}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
