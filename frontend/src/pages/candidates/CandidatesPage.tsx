import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Filter, SlidersHorizontal, Upload, ChevronUp, ChevronDown } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge, DecisionBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { candidatesApi } from '@/lib/api'
import { formatDate, getScoreColor } from '@/lib/utils'
import type { Candidate, DecisionStatus } from '@/types'

const DECISIONS: (DecisionStatus | 'all')[] = ['all', 'shortlisted', 'review', 'rejected']

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [decision, setDecision]   = useState<DecisionStatus | 'all'>('all')
  const [sortBy, setSortBy]       = useState<'score' | 'similarity' | 'date'>('score')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [page, setPage]           = useState(1)
  const PAGE_SIZE = 20

  // Use mock data for demo; replace with API call
  const candidates: Candidate[] = MOCK_CANDIDATES
  const filtered = candidates
    .filter((c) => decision === 'all' || c.decision === decision)
    .filter((c) => {
      const q = search.toLowerCase()
      return (
        c.structured_data?.skills?.some(s => s.toLowerCase().includes(q)) ||
        c.original_filename.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const key = sortBy === 'score' ? 'weighted_score' : sortBy === 'similarity' ? 'vector_similarity_score' : 'uploaded_at'
      const av = a[key as keyof Candidate] as number | string
      const bv = b[key as keyof Candidate] as number | string
      return sortDir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1)
    })

  const paged    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPg  = Math.ceil(filtered.length / PAGE_SIZE)

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    sortBy === col
      ? sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
      : null
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Candidates" subtitle={`${filtered.length} candidates found`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-52">
            <Input placeholder="Search by skill, filename..." icon={<Search size={14} />}
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          {/* Decision filter tabs */}
          <div className="flex bg-surface-800 border border-white/5 rounded-lg p-1 gap-0.5">
            {DECISIONS.map((d) => (
              <button key={d}
                onClick={() => { setDecision(d); setPage(1) }}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  decision === d ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {[
                  { label: 'Candidate',   col: null },
                  { label: 'Skills',      col: null },
                  { label: 'Exp',         col: null },
                  { label: 'Similarity',  col: 'similarity' as const },
                  { label: 'Score',       col: 'score' as const },
                  { label: 'Decision',    col: null },
                  { label: 'Date',        col: 'date' as const },
                  { label: '',            col: null },
                ].map(({ label, col }) => (
                  <th key={label}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 ${col ? 'cursor-pointer hover:text-gray-300 select-none' : ''}`}
                    onClick={() => col && toggleSort(col)}
                  >
                    <span className="flex items-center gap-1">
                      {label} {col && <SortIcon col={col} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-white/3 hover:bg-white/3 transition-colors cursor-pointer"
                  onClick={() => navigate(`/candidates/${c.resume_id}`)}
                >
                  {/* Candidate */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-medium text-gray-400">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-gray-200 font-medium text-xs truncate max-w-32">
                          {c.original_filename.replace(/\.[^.]+$/, '')}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {c.structured_data?.experience_years}y exp
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Skills */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap max-w-40">
                      {c.structured_data?.skills?.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-600 text-gray-400">
                          {s}
                        </span>
                      ))}
                      {(c.structured_data?.skills?.length ?? 0) > 3 && (
                        <span className="text-[10px] text-gray-600">
                          +{(c.structured_data?.skills?.length ?? 0) - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Experience */}
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {c.structured_data?.experience_years}y
                  </td>

                  {/* Similarity */}
                  <td className="px-4 py-3 min-w-28">
                    <ProgressBar value={c.vector_similarity_score * 100}
                      showValue={false} className="min-w-24" />
                    <span className="text-[10px] text-gray-500">
                      {(c.vector_similarity_score * 100).toFixed(0)}%
                    </span>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${getScoreColor(c.weighted_score)}`}>
                      {c.weighted_score.toFixed(1)}
                    </span>
                  </td>

                  {/* Decision */}
                  <td className="px-4 py-3">
                    <DecisionBadge decision={c.decision} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(c.uploaded_at).toLocaleDateString()}
                  </td>

                  {/* Arrow */}
                  <td className="px-4 py-3 text-gray-600">›</td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPg > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <span className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="ghost" size="sm" disabled={page === totalPg} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Mock candidates (replace with API)
const MOCK_CANDIDATES: Candidate[] = Array.from({ length: 45 }, (_, i) => ({
  id: `c-${i}`, resume_id: `r-${i}`, job_id: '1',
  original_filename: `candidate_${i + 1}_resume.pdf`,
  structured_data: {
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis'].slice(0, (i % 5) + 1),
    experience_years: Math.round((Math.random() * 8 + 1) * 10) / 10,
    experience_entries: [], projects: [], certifications: [], education: [], summary: '',
  },
  bias_scrubbed_fields: ['email address', 'phone number'],
  vector_similarity_score: Math.random() * 0.5 + 0.4,
  weighted_score: Math.random() * 60 + 30,
  score_breakdown: {
    required_skills_score: Math.random() * 60 + 40,
    preferred_skills_score: Math.random() * 50 + 30,
    experience_score: Math.random() * 70 + 20,
    project_relevance_score: Math.random() * 60 + 20,
    certification_score: Math.random() * 80 + 10,
    weighted_total: Math.random() * 60 + 30,
  },
  decision: (['shortlisted', 'review', 'rejected'] as DecisionStatus[])[i % 3],
  guardrail_violations: [],
  uploaded_at: new Date(Date.now() - i * 3600000).toISOString(),
}))