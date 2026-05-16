import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  animate?: boolean
}

export function Card({ children, className, hover, onClick, animate = true }: CardProps) {
  const cls = cn(hover ? 'glass-card-hover cursor-pointer' : 'glass-card', className)
  if (animate) {
    return (
      <motion.div
        className={cls}
        onClick={onClick}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    )
  }
  return <div className={cls} onClick={onClick}>{children}</div>
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-gray-200', className)}>{children}</h3>
}