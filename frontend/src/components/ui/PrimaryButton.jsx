import React from 'react'
import { Loader2 } from 'lucide-react'

const buttonVariants = {
  primary: 'bg-brand-primary text-white hover:bg-brand-primary/90 focus:ring-2 focus:ring-brand-primary/20',
  secondary: 'bg-surface-card border border-border-soft text-brand-primary hover:bg-surface-muted focus:ring-2 focus:ring-brand-accent/20',
  accent: 'bg-brand-accent text-white hover:bg-brand-accent/90 focus:ring-2 focus:ring-brand-accent/20',
  ghost: 'text-text-muted hover:text-text-body hover:bg-surface-muted focus:ring-2 focus:ring-brand-primary/20'
}

const buttonSizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg'
}

export default function PrimaryButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  as: Component = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClasses = buttonVariants[variant] || buttonVariants.primary
  const sizeClasses = buttonSizes[size] || buttonSizes.md

  return (
    <Component
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      disabled={Component === 'button' ? (disabled || loading) : undefined}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      
      {Icon && iconPosition === 'left' && !loading && (
        <Icon className="w-4 h-4" />
      )}
      
      <span>{children}</span>
      
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className="w-4 h-4" />
      )}
    </Component>
  )
}
