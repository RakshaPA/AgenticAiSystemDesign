import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Briefcase, Users, ChevronRight, Search, Sliders, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { JobCreateModal } from './JobCreateModal'
import type { JobDescription } from '@/types'

const INITIAL_JOBS: JobDescription[] = [
  {
    id: '1', title: 'Senior Backend Engineer', status: 'active',
    description: 'Build scalable APIs with Python and FastAPI for our AI platform.',
    required_skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis'],
    preferred_skills: ['LangChain', 'pgvector', 'Kubernetes'],
    min_experience_years: 4, required_certifications: [],
    shortlist_threshold: 72, review_threshold: 50,
    total_applications: 0, shortlisted: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: '2', title: 'ML Engineer', status: 'active',
    description: 'Design and deploy production-grade ML models and embedding pipelines.',
    required_skills: ['Python', 'PyTorch', 'scikit-learn', 'MLflow'],
    preferred_skills: ['LangChain', 'FAISS', 'Triton'],
    min_experience_years: 3, required_certifications: ['AWS ML Specialty'],
    shortlist_threshold: 72, review_threshold: 50,
    total_applications: 0, shortlisted: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: '3', title: 'Frontend Engineer', status: 'active',
    description: 'Build enterprise-grade React applications with TypeScript and Tailwind.',
    required_skills: ['React', 'TypeScript', 'TailwindCSS', 'Zustand'],
    preferred_skills: ['Framer Motion', 'Recharts', 'Vite'],
    min_experience_years: 2, required_certifications: [],
    shortlist_threshold: 72, review_threshold: 50,
    total_applications: 0, shortlisted: 0,
    created_at: new Date().toISOString(),
  },
]

export const globalJobs = INITIAL_JOBS;

export default function JobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<JobDescription[]>(INITIAL_JOBS)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const filtered = jobs.filter((j) =>
    (j.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (j.required_skills ?? []).some(s => (s ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = (newJob: any) => {
    // axios wraps the response in .data; normalise here
    const job: JobDescription = newJob?.data ?? newJob
    setJobs((prev) => [{
      ...job,
      status: job.status ?? 'active',
      total_applications: job.total_applications ?? 0,
      shortlisted: job.shortlisted ?? 0,
      shortlist_threshold: job.shortlist_threshold ?? 72,
      review_threshold: job.review_threshold ?? 50,
      preferred_skills: job.preferred_skills ?? [],
      required_skills: job.required_skills ?? [],
    }, ...prev])
    setShowModal(false)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirmId === id) {
      setJobs((prev) => prev.filter((j) => j.id !== id))
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(id)
      // Auto-cancel confirm after 3 seconds
      setTimeout(() => setDeleteConfirmId((cur) => cur === id ? null : cur), 3000)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Job Management" subtitle="Manage open positions and AI screening criteria" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search positions..."
              icon={<Search size={14} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" className="gap-2">
            <Sliders size={14} /> Filter
          </Button>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus size={14} /> New Position
          </Button>
        </div>

        {/* Count */}
        <p className="text-xs text-gray-500">
          {filtered.length} position{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Job Cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Briefcase size={40} className="text-gray-700 mb-4" />
            <p className="text-gray-400 font-medium">No positions found</p>
            <p className="text-sm text-gray-600 mt-1">
              {search ? 'Try a different search term' : 'Create your first position to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((job, i) => (
                <motion.div
                  key={job.id ?? job.title ?? i}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div
                    className="glass-card-hover p-5 cursor-pointer relative group"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    {/* Delete button — visible on hover */}
                    <button
                      onClick={(e) => handleDelete(job.id, e)}
                      className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${deleteConfirmId === job.id
                          ? 'bg-red-500 text-white opacity-100 scale-105'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20 opacity-0 group-hover:opacity-100'
                        }`}
                    >
                      <Trash2 size={11} />
                      {deleteConfirmId === job.id ? 'Confirm?' : 'Delete'}
                    </button>

                    {/* Card header */}
                    <div className="flex items-start gap-3 mb-4 pr-16">
                      <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Briefcase size={18} className="text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={job.status === 'active' ? 'info' : 'default'}>
                            {job.status}
                          </Badge>
                          <span className="text-[10px] text-gray-600">
                            {job.min_experience_years}y+ exp
                          </span>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-200 mb-1">{job.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{job.description}</p>

                    {/* Required Skills */}
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {(job.required_skills ?? []).slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-surface-600 text-gray-400 border border-white/5"
                        >
                          {skill}
                        </span>
                      ))}
                      {(job.required_skills ?? []).length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-600 text-gray-600">
                          +{(job.required_skills ?? []).length - 4}
                        </span>
                      )}
                    </div>

                    {/* Preferred Skills (subtle) */}
                    {(job.preferred_skills ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(job.preferred_skills ?? []).slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/8 text-violet-500/70 border border-violet-500/15"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Users size={12} />
                        <span>{job.total_applications ?? 0} applicants</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        {job.shortlisted ?? 0} shortlisted
                      </div>
                      <ChevronRight size={14} className="text-gray-600" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showModal && (
        <JobCreateModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}