import React from 'react'
import { cn } from '../../lib/utils'

const typographyVariants = {
  // Page Titles
  pageTitle: 'text-4xl md:text-5xl font-bold text-brand-primary tracking-tight leading-relaxed',
  
  // Section Titles
  sectionTitle: 'text-2xl md:text-3xl font-semibold text-brand-primary leading-relaxed',
  sectionSubtitle: 'text-lg text-text-muted leading-8',

  // Card Titles
  cardTitle: 'text-xl font-semibold text-brand-primary leading-relaxed',
  cardSubtitle: 'text-sm text-text-muted leading-6',

  // Body Text
  body: 'text-base text-text-body leading-7',
  bodySmall: 'text-sm text-text-muted leading-6',

  // Muted Text
  muted: 'text-sm text-text-muted leading-6',
  caption: 'text-xs text-text-muted uppercase tracking-wide',
  
  // Button Text
  buttonText: 'font-medium',
  buttonTextSmall: 'text-sm font-medium',
  
  // Labels
  label: 'text-sm font-medium text-text-body',
  labelLarge: 'text-base font-medium text-text-body'
}

export default function Typography({
  variant = 'body',
  className = '',
  children,
  as: Component = 'div',
  ...props
}) {
  const variantClasses = typographyVariants[variant] || typographyVariants.body
  
  return (
    <Component
      className={cn(variantClasses, className)}
      {...props}
    >
      {children}
    </Component>
  )
}

// Export specific components for common use cases
export function PageTitle({ className = '', ...props }) {
  return <Typography variant="pageTitle" as="h1" className={className} {...props} />
}

export function SectionTitle({ className = '', ...props }) {
  return <Typography variant="sectionTitle" as="h2" className={className} {...props} />
}

export function SectionSubtitle({ className = '', ...props }) {
  return <Typography variant="sectionSubtitle" as="p" className={className} {...props} />
}

export function CardTitle({ className = '', ...props }) {
  return <Typography variant="cardTitle" as="h3" className={className} {...props} />
}

export function CardSubtitle({ className = '', ...props }) {
  return <Typography variant="cardSubtitle" as="p" className={className} {...props} />
}

export function BodyText({ className = '', ...props }) {
  return <Typography variant="body" as="p" className={className} {...props} />
}

export function MutedText({ className = '', ...props }) {
  return <Typography variant="muted" as="span" className={className} {...props} />
}

export function Caption({ className = '', ...props }) {
  return <Typography variant="caption" as="span" className={className} {...props} />
}
