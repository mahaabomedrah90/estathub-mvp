import React from 'react'

/**
 * Standardized page wrapper component for consistent layout across all pages
 * Provides unified container width, padding, and spacing
 */
export default function PageWrapper({ 
  children, 
  className = '',
  size = 'default',
  withTopPadding = true,
  withBottomPadding = true 
}) {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-6xl', 
    wide: 'max-w-7xl',
    full: 'max-w-none'
  }

  const paddingClasses = {
    top: withTopPadding ? 'pt-10 lg:pt-14' : '',
    bottom: withBottomPadding ? 'pb-10 lg:pb-14' : '',
    horizontal: 'px-4 sm:px-6 lg:px-8'
  }

  return (
    <div className={`
      w-full mx-auto
      ${sizeClasses[size] || sizeClasses.default}
      ${paddingClasses.top}
      ${paddingClasses.bottom}
      ${paddingClasses.horizontal}
      ${className}
    `}>
      {children}
    </div>
  )
}
