import React from 'react'
import { PageTitle, SectionSubtitle } from './Typography'

/**
 * Standardized hero section component for consistent page headers
 */
export default function HeroSection({ 
  title, 
  subtitle, 
  className = '',
  size = 'default',
  centered = true 
}) {
  const sizeClasses = {
    narrow: 'max-w-3xl',
    default: 'max-w-4xl', 
    wide: 'max-w-5xl'
  }

  const alignmentClasses = centered ? 'text-center' : 'text-left'

  return (
    <div className={`
      ${alignmentClasses}
      ${sizeClasses[size] || sizeClasses.default}
      mx-auto
      mb-10 lg:mb-14
      ${className}
    `}>
      <PageTitle className="mb-4">
        {title}
      </PageTitle>
      {subtitle && (
        <SectionSubtitle className={centered ? 'mx-auto' : ''}>
          {subtitle}
        </SectionSubtitle>
      )}
    </div>
  )
}
