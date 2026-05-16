import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import type { ScoreBreakdown } from '@/types'

export function CandidateRadarChart({ breakdown }: { breakdown: ScoreBreakdown }) {
  const data = [
    { metric: 'Req. Skills',   value: breakdown.required_skills_score },
    { metric: 'Pref. Skills',  value: breakdown.preferred_skills_score },
    { metric: 'Experience',    value: breakdown.experience_score },
    { metric: 'Projects',      value: breakdown.project_relevance_score },
    { metric: 'Certs',         value: breakdown.certification_score },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(v: number) => [`${v.toFixed(1)}%`, 'Score']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}