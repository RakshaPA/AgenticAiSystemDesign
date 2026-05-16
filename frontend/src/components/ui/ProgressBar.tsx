import { motion } from 'framer-motion'
import { cn, getScoreGradient } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  label?: string
  showValue?: boolean
  color?: string
  className?: string
}

export function ProgressBar({ value, label, showValue = true, color, className }: ProgressBarProps) {
  const gradient = color ?? getScoreGradient(value)
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs">
          {label && <span className="text-gray-400">{label}</span>}
          {showValue && <span className="text-gray-300 font-medium">{value.toFixed(1)}%</span>}
        </div>
      )}
      <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', gradient)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}