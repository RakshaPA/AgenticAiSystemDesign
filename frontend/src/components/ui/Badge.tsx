import { cn, getDecisionBadgeClass } from '@/lib/utils'
import type { DecisionStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | DecisionStatus | 'info' | 'warning'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border'
  const variants: Record<string, string> = {
    default:     'bg-gray-500/15 text-gray-400 border-gray-500/30',
    info:        'bg-blue-500/15 text-blue-400 border-blue-500/30',
    warning:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
    shortlisted: 'badge-shortlisted',
    review:      'badge-review',
    rejected:    'badge-rejected',
  }
  return (
    <span className={cn(base, variants[variant] ?? variants.default, className)}>
      {children}
    </span>
  )
}

export function DecisionBadge({ decision }: { decision: DecisionStatus }) {
  const labels = { shortlisted: '✓ Shortlisted', review: '⟳ Under Review', rejected: '✕ Rejected' }
  return <Badge variant={decision}>{labels[decision]}</Badge>
}