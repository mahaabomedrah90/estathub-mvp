import React from 'react'

/**
 * Standardized section wrapper for consistent vertical rhythm
 * Provides unified spacing between sections
 */
export default function SectionWrapper({ 
  children, 
  className = '',
  size = 'default',
  withTopMargin = true,
  withBottomMargin = true 
}) {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-6xl', 
    wide: 'max-w-7xl',
    full: 'max-w-none'
  }

  const marginClasses = {
    top: withTopMargin ? 'mt-12 lg:mt-20' : '',
    bottom: withBottomMargin ? 'mb-12 lg:mb-20' : '',
    horizontal: 'px-4 sm:px-6 lg:px-8'
  }

  return (
    <section className={`
      w-full mx-auto
      ${sizeClasses[size] || sizeClasses.default}
      ${marginClasses.top}
      ${marginClasses.bottom}
      ${marginClasses.horizontal}
      ${className}
    `}>
      {children}
    </section>
  )
}
