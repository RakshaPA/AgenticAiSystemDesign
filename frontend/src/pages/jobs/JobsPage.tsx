import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Briefcase, Users, ChevronRight, Search, Sliders, Trash2, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { jobsApi } from '@/lib/api'
import { ResumeDropzone } from '@/components/upload/ResumeDropzone'
import type { JobDescription } from '@/types'
import { JobCreateModal } from '../jobs/JobCreateModal'

export default function JobsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { jobId } = useParams<{ jobId?: string }>()
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.list().then(r => r.data),
    // fallback to mock if backend is down
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      setDeleteConfirm(null)
    },
  })

  // Use real API data; fall back to mock only if backend completely fails
  const allJobs: JobDescription[] = jobs ?? (error ? MOCK_JOBS : [])
  const filtered = allJobs.filter((j: JobDescription) =>
    j.title.toLowerCase().includes(search.toLowerCase())
  )

  // ── Job Detail View (with resume upload) ──────────────────────────────────
  if (jobId) {
    const job = allJobs.find(j => j.id === jobId) ??
      MOCK_JOBS.find(j => j.id === jobId)

    return (
      <div className="flex flex-col h-full">
        <TopBar
          title={job?.title ?? 'Job Detail'}
          subtitle={`Upload & screen resumes for this position`}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Back button */}
          <button
            onClick={() => navigate('/jobs')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={15} /> Back to Job Management
          </button>

          {/* Job info card */}
          {job && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <Briefcase size={18} className="text-brand-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-100">{job.title}</h2>
                  <p className="text-xs text-gray-500">{job.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills?.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resume upload */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-gray-200 mb-1">Upload Resumes</h3>
            <p className="text-xs text-gray-500 mb-4">
              Drop PDF or DOCX files — each will be automatically parsed, bias-scrubbed, and scored.
            </p>
            <ResumeDropzone jobId={jobId} />
          </div>
        </div>
      </div>
    )
  }

  // ── Job List View ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Job Management" subtitle="Manage open positions and AI screening criteria" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input placeholder="Search positions..." icon={<Search size={14} />}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="secondary" size="sm" className="gap-2">
            <Sliders size={14} /> Filter
          </Button>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus size={14} /> New Position
          </Button>
        </div>

        {/* Error notice if backend is down */}
        {error && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
            ⚠ Could not connect to backend — showing sample data. Start the backend server to enable full functionality.
          </div>
        )}

        {/* Job Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((job: JobDescription, i: number) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card hover className="p-5 relative group">
                  {/* Delete button */}
                  <button
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(job.id) }}
                    title="Delete position"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Briefcase size={18} className="text-brand-400" />
                      </div>
                      <Badge variant={job.status === 'active' ? 'info' : 'default'}>
                        {job.status ?? 'active'}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-gray-200 mb-1">{job.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{job.description}</p>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.required_skills?.slice(0, 4).map((skill) => (
                        <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-600 text-gray-400 border border-white/5">
                          {skill}
                        </span>
                      ))}
                      {(job.required_skills?.length ?? 0) > 4 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-600 text-gray-600">
                          +{job.required_skills.length - 4}
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Users size={12} />
                        <span>{job.total_applications ?? 0} applicants</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <span>{job.shortlisted ?? 0} shortlisted</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-600" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
        </div>

        {filtered.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Briefcase size={32} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">No positions found</p>
            <p className="text-gray-600 text-xs mt-1">Create your first position to start screening candidates</p>
            <Button className="mt-4" size="sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> New Position
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && <JobCreateModal onClose={() => setShowModal(false)} />}

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-100">Delete Position</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Are you sure you want to delete <span className="text-gray-200 font-medium">
                  "{allJobs.find(j => j.id === deleteConfirm)?.title}"
                </span>?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteConfirm!)}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const MOCK_JOBS: JobDescription[] = [
  {
    id: '1', title: 'Senior Backend Engineer', status: 'active',
    description: 'Build scalable APIs with Python and FastAPI for our AI platform.',
    required_skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis'],
    preferred_skills: ['LangChain', 'pgvector', 'Kubernetes'],
    min_experience_years: 4, required_certifications: [],
    shortlist_threshold: 72, review_threshold: 50,
    total_applications: 312, shortlisted: 28,
    created_at: '2025-05-01T00:00:00Z',
  },
  {
    id: '2', title: 'ML Engineer', status: 'active',
    description: 'Design and deploy production-grade ML models and embedding pipelines.',
    required_skills: ['Python', 'PyTorch', 'scikit-learn', 'MLflow'],
    preferred_skills: ['LangChain', 'FAISS', 'Triton'],
    min_experience_years: 3, required_certifications: ['AWS ML Specialty'],
    shortlist_threshold: 72, review_threshold: 50,
    total_applications: 189, shortlisted: 19,
    created_at: '2025-05-03T00:00:00Z',
  },
  {
    id: '3', title: 'Frontend Engineer', status: 'active',
    description: 'Build enterprise-grade React applications with TypeScript and Tailwind.',
    required_skills: ['React', 'TypeScript', 'TailwindCSS', 'Zustand'],
    preferred_skills: ['Framer Motion', 'Recharts', 'Vite'],
    min_experience_years: 2, required_certifications: [],
    shortlist_threshold: 72, review_threshold: 50,
    total_applications: 401, shortlisted: 35,
    created_at: '2025-05-05T00:00:00Z',
  },
]