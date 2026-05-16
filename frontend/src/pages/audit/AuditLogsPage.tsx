import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, Download, Filter } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { DecisionBadge, Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { AuditLog } from '@/types'

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')

  const logs = MOCK_AUDIT_LOGS.filter((l) =>
    l.resume_id.toLowerCase().includes(search.toLowerCase()) ||
    l.decision.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Audit Logs" subtitle="Complete chronological record of all screening decisions" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input placeholder="Search by resume ID or decision..."
              icon={<Search size={14} />}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="secondary" size="sm"><Filter size={14} /> Filter</Button>
          <Button variant="ghost" size="sm"><Download size={14} /> Export CSV</Button>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <ScrollText size={15} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-300">{logs.length} audit records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-surface-700/30">
                  {['Timestamp', 'Resume ID', 'Job', 'Score', 'Similarity', 'Decision', 'Bias Removed', 'Override', 'Violations'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <motion.tr key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/3 hover:bg-white/2"
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {log.resume_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{log.job_id.slice(0, 6)}…</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-200">
                      {log.weighted_score.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {(log.vector_similarity_score * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3"><DecisionBadge decision={log.decision} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-emerald-400">{log.bias_fields_removed.length} fields</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.reviewer_override
                        ? <Badge variant="warning">Override</Badge>
                        : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {log.guardrail_violations.length > 0
                        ? <Badge variant="warning">{log.guardrail_violations.length}</Badge>
                        : <span className="text-xs text-emerald-600">✓ Clean</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

const MOCK_AUDIT_LOGS: AuditLog[] = Array.from({ length: 30 }, (_, i) => ({
  id: `audit-${i}`, resume_id: `resume-${Math.random().toString(36).slice(2, 10)}`,
  job_id: `job-${i % 3 + 1}`,
  decision: (['shortlisted', 'review', 'rejected'] as const)[i % 3],
  vector_similarity_score: Math.random() * 0.5 + 0.4,
  weighted_score: Math.random() * 60 + 30,
  score_breakdown: {
    required_skills_score: 80, preferred_skills_score: 65, experience_score: 75,
    project_relevance_score: 70, certification_score: 60, weighted_total: 72,
  },
  bias_fields_removed: ['email address', 'phone number', i % 2 === 0 ? 'date of birth' : 'address'].filter(Boolean),
  guardrail_violations: i % 7 === 0 ? ['GUARDRAIL_SCORE_BYPASS: Score 69.8 below shortlist threshold'] : [],
  llm_explanation: 'Candidate evaluated based on professional competencies only.',
  reviewer_override: i % 9 === 0,
  reviewer_notes: i % 9 === 0 ? 'Manually approved after portfolio review' : undefined,
  created_at: new Date(Date.now() - i * 3600000 * 2).toISOString(),
}))