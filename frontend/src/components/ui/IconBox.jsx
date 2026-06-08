import React from 'react'

/**
 * Standardized icon box component for consistent icon sizing and styling
 */
export default function IconBox({ 
  children, 
  size = 'md', 
  variant = 'default',
  className = '',
  ...props 
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  }

  const variantClasses = {
    default: 'bg-brand-accent-soft text-brand-accent',
    primary: 'bg-brand-primary/5 text-brand-primary',
    muted: 'bg-surface-muted text-text-muted',
    white: 'bg-white/10 text-white',
    vision: 'bg-vision-purple-soft text-vision-purple'
  }

  return (
    <div 
      className={`
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.default}
        rounded-xl flex items-center justify-center
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
