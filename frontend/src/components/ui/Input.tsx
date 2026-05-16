import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200',
            'placeholder:text-gray-600 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30',
            'transition-all duration-200',
            icon && 'pl-9',
            error && 'border-red-500/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'