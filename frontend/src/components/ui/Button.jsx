import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 border-transparent',
  secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700',
  danger:    'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30',
  ghost:     'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent',
  outline:   'bg-transparent text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs gap-1.5',
  sm: 'px-3 py-1.5 text-sm gap-2',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2.5',
  xl: 'px-6 py-3 text-base gap-3',
}

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    fullWidth = false,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 active:scale-[0.97]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" />
      ) : Icon ? (
        <Icon size={14} className="shrink-0" />
      ) : null}
      {children}
      {!loading && IconRight && <IconRight size={14} className="shrink-0" />}
    </button>
  )
})

export default Button