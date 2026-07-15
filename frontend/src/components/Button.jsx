const cx = (...classes) => classes.filter(Boolean).join(' ')

const variants = {
  primary:
    'bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-card hover:shadow-elevated focus-visible:ring-brand-accent',
  secondary:
    'bg-surface-muted text-gray-700 hover:bg-surface-card disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-brand-accent',
  outline:
    'bg-transparent border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-brand-primary',
  'outline-accent':
    'bg-transparent border border-brand-accent text-brand-accent hover:bg-brand-accent/5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-brand-accent',
  gradient:
    'bg-gradient-to-r from-brand-primary to-brand-accent text-white hover:shadow-elevated hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-brand-accent',
  ghost:
    'bg-transparent text-brand-accent hover:text-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-brand-accent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-red-500',
}

const sizes = {
  xs: 'px-3 py-1.5 text-xs rounded-lg font-semibold',
  sm: 'px-4 py-2 text-sm rounded-xl font-semibold',
  md: 'px-5 py-2.5 text-sm rounded-xl font-semibold',
  lg: 'px-6 py-3 text-base rounded-xl font-bold',
  xl: 'px-8 py-4 text-lg rounded-xl font-bold',
}

/**
 * Reusable Button component.
 *
 * @param {'primary'|'secondary'|'outline'|'outline-accent'|'gradient'|'ghost'|'danger'} variant
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size
 * @param {boolean} fullWidth  – adds w-full
 * @param {string}  className  – extra Tailwind overrides
 * @param {React.ReactNode} children
 * All other props (onClick, type, disabled, …) are forwarded to <button>.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 outline-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
