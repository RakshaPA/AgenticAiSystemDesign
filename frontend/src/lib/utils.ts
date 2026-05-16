import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DecisionStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number) {
  return `${score.toFixed(1)}%`
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function getDecisionBadgeClass(decision: DecisionStatus) {
  return {
    shortlisted: 'badge-shortlisted',
    review: 'badge-review',
    rejected: 'badge-rejected',
  }[decision]
}

export function getScoreColor(score: number) {
  if (score >= 72) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export function getScoreGradient(score: number) {
  if (score >= 72) return 'from-emerald-500 to-teal-500'
  if (score >= 50) return 'from-amber-500 to-orange-500'
  return 'from-red-500 to-rose-500'
}

export const PIPELINE_STAGES = [
  { key: 'uploading',           label: 'Uploading File' },
  { key: 'extracting',          label: 'Extracting Text' },
  { key: 'scrubbing_bias',      label: 'Removing Bias Fields' },
  { key: 'parsing',             label: 'Parsing Resume' },
  { key: 'embedding',           label: 'Generating Embeddings' },
  { key: 'similarity_matching', label: 'Similarity Matching' },
  { key: 'scoring',             label: 'Weighted Scoring' },
  { key: 'explaining',          label: 'AI Explanation' },
  { key: 'done',                label: 'Complete' },
] as const