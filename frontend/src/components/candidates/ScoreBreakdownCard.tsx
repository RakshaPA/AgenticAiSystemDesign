import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ScoreBreakdown } from '@/types'

const METRICS = [
  { key: 'required_skills_score',   label: 'Required Skills',   weight: '35%' },
  { key: 'preferred_skills_score',  label: 'Preferred Skills',  weight: '20%' },
  { key: 'experience_score',        label: 'Experience Level',  weight: '25%' },
  { key: 'project_relevance_score', label: 'Project Relevance', weight: '12%' },
  { key: 'certification_score',     label: 'Certifications',    weight: '8%' },
] as const

interface Props { breakdown: ScoreBreakdown }

export function ScoreBreakdownCard({ breakdown }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
        <span className="text-xs text-gray-500">Weighted evaluation</span>
      </CardHeader>
      <div className="space-y-3 mt-1">
        {METRICS.map((m) => (
          <div key={m.key}>
            <ProgressBar
              value={breakdown[m.key]}
              label={`${m.label} (${m.weight})`}
            />
          </div>
        ))}
        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-300">Final Score</span>
          <span className="text-lg font-bold text-brand-400">
            {breakdown.weighted_total.toFixed(1)}
          </span>
        </div>
      </div>
    </Card>
  )
}