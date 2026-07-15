const cx = (...classes) => classes.filter(Boolean).join(' ')

const variants = {
  // Standard white card used across all pages
  default:
    'bg-surface-card border border-surface-border shadow-card rounded-2xl',
  // Subtle gray surface (stats / inner panels)
  muted:
    'bg-surface-muted border border-surface-border shadow-soft rounded-xl',
  // Solid dark brand card (trust / compliance sections)
  primary:
    'bg-brand-primary text-white rounded-2xl',
  // Translucent overlay card
  glass:
    'bg-surface-card/80 backdrop-blur-sm border border-surface-border shadow-lg rounded-xl',
  // Brand gradient hero card
  gradient:
    'bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-xl rounded-2xl',
  // Semantic feedback cards
  info:
    'bg-blue-50 border border-blue-200 rounded-xl',
  warning:
    'bg-amber-50 border border-amber-200 rounded-xl',
  error:
    'bg-red-50 border border-red-200 rounded-xl',
  success:
    'bg-emerald-50 border border-emerald-200 rounded-xl',
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

/**
 * Reusable Card component.
 *
 * @param {'default'|'muted'|'primary'|'glass'|'gradient'|'info'|'warning'|'error'|'success'} variant
 * @param {'none'|'sm'|'md'|'lg'} padding
 * @param {boolean} hover  – adds hover:shadow-xl transition-shadow
 * @param {boolean} overflow  – adds overflow-hidden (needed when card contains images)
 * @param {string}  className  – extra Tailwind overrides
 * @param {React.ReactNode} children
 * All other props (onClick, …) are forwarded to the wrapper <div>.
 */
export default function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  overflow = false,
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cx(
        variants[variant],
        paddings[padding],
        hover && 'hover:shadow-elevated transition-shadow duration-200',
        overflow && 'overflow-hidden',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
