import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  ArrowLeft, Briefcase, Upload, FileText, X,
  CheckCircle2, AlertCircle, Loader2, Users,
  ChevronRight, Award, Clock,
} from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Badge, DecisionBadge } from '@/components/ui/Badge'
import { globalJobs } from './JobsPage'
import type { Candidate, DecisionStatus, PipelineStage } from '@/types'
import { PIPELINE_STAGES, getScoreColor } from '@/lib/utils'

// ── Pipeline simulation ───────────────────────────────────────────────────────
const STAGE_KEYS: PipelineStage[] = [
  'uploading', 'extracting', 'scrubbing_bias', 'parsing',
  'embedding', 'similarity_matching', 'scoring', 'explaining', 'done',
]

interface UploadItem {
  id: string
  filename: string
  size: number
  stage: PipelineStage
  progress: number
  stageLabel: string
  result?: Candidate
  error?: string
}

function simulatePipeline(
  item: UploadItem,
  onUpdate: (patch: Partial<UploadItem>) => void
) {
  let idx = 0
  const tick = () => {
    if (idx >= STAGE_KEYS.length) return
    const stage = STAGE_KEYS[idx]
    const progress = Math.round(((idx + 1) / STAGE_KEYS.length) * 100)
    const stageLabel = PIPELINE_STAGES.find(s => s.key === stage)?.label ?? stage

    if (stage === 'done') {
      // Generate mock result
      const score = Math.random() * 55 + 38
      const sim = Math.random() * 0.45 + 0.42
      const decision: DecisionStatus =
        score >= 72 ? 'shortlisted' : score >= 50 ? 'review' : 'rejected'

      const result: Candidate = {
        id: item.id,
        resume_id: item.id,
        job_id: 'current',
        original_filename: item.filename,
        structured_data: {
          skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'].slice(0, Math.floor(Math.random() * 3) + 2),
          experience_years: Math.round((Math.random() * 6 + 1) * 10) / 10,
          experience_entries: [],
          projects: [],
          certifications: [],
          education: [],
          summary: '',
        },
        bias_scrubbed_fields: ['email address', 'phone number', 'street address'],
        vector_similarity_score: sim,
        weighted_score: score,
        score_breakdown: {
          required_skills_score: Math.random() * 50 + 45,
          preferred_skills_score: Math.random() * 60 + 25,
          experience_score: Math.random() * 55 + 35,
          project_relevance_score: Math.random() * 60 + 20,
          certification_score: Math.random() * 70 + 15,
          weighted_total: score,
        },
        decision,
        llm_explanation:
          decision === 'shortlisted'
            ? 'Strong required skills match and relevant experience. Candidate profile aligns well with role requirements.'
            : decision === 'review'
              ? 'Meets some criteria but has gaps in required skills. Recommend manual review.'
              : 'Required skills match below threshold. Does not meet minimum criteria for this role.',
        guardrail_violations: [],
        uploaded_at: new Date().toISOString(),
        evaluated_at: new Date().toISOString(),
      }
      onUpdate({ stage, progress: 100, stageLabel, result })
      return
    }

    onUpdate({ stage, progress, stageLabel })
    idx++
    setTimeout(tick, 600 + Math.random() * 500)
  }
  setTimeout(tick, 300)
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const job = globalJobs.find(j => j.id === jobId)

  const [uploads, setUploads] = useState<UploadItem[]>([])

  const updateUpload = (id: string, patch: Partial<UploadItem>) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
  }

  const onDrop = useCallback((accepted: File[]) => {
    const valid = accepted.filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.docx')
    )
    if (!valid.length) return

    const newItems: UploadItem[] = valid.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      filename: file.name,
      size: file.size,
      stage: 'uploading',
      progress: 0,
      stageLabel: 'Uploading File',
    }))

    setUploads(prev => [...prev, ...newItems])
    newItems.forEach(item => {
      simulatePipeline(item, (patch) => updateUpload(item.id, patch))
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  })

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id))
  }

  const completedUploads = uploads.filter(u => u.stage === 'done' && u.result)
  const processingUploads = uploads.filter(u => u.stage !== 'done')

  if (!job) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Job Not Found" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Briefcase size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">This job position could not be found.</p>
            <button onClick={() => navigate('/jobs')}
              className="mt-4 text-sm text-brand-400 hover:text-brand-300">
              ← Back to Job Management
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title={job.title} subtitle="Job details and resume upload" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Job Management
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* ── LEFT: Job Info + Upload ───────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">
            {/* Job card */}
            <div className="glass-card p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Briefcase size={22} className="text-brand-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-lg font-bold text-gray-100">{job.title}</h2>
                    <Badge variant={job.status === 'active' ? 'info' : 'default'}>{job.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{job.description}</p>
                </div>
              </div>

              {/* Meta row */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-100">{job.min_experience_years}+</p>
                  <p className="text-xs text-gray-500">Years Required</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{job.shortlist_threshold}%</p>
                  <p className="text-xs text-gray-500">Shortlist Threshold</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-400">{job.review_threshold}%</p>
                  <p className="text-xs text-gray-500">Review Threshold</p>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="glass-card p-5">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Required Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map(s => (
                      <span key={s} className="text-xs px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                {job.preferred_skills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Preferred Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.preferred_skills.map(s => (
                        <span key={s} className="text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Dropzone ──────────────────────────────────────────────── */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Upload Resumes</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Drop PDF or DOCX files — each will be processed through the full AI pipeline
                </p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${isDragActive
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/2'
                  }`}
              >
                <input {...getInputProps()} />
                <motion.div
                  animate={{ scale: isDragActive ? 1.05 : 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <Upload
                    size={32}
                    className={isDragActive ? 'text-brand-400' : 'text-gray-600'}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      {isDragActive ? 'Release to upload' : 'Drag & drop resumes here'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      PDF or DOCX • Multiple files supported
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={e => e.stopPropagation()}
                    className="px-4 py-1.5 text-xs border border-brand-500/40 text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                  >
                    Browse Files
                  </button>
                </motion.div>
              </div>

              {/* Processing uploads */}
              <AnimatePresence>
                {processingUploads.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-surface-700/60 border border-white/5 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={15} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-300 flex-1 truncate">{item.filename}</span>
                      <span className="text-xs text-gray-600">
                        {(item.size / 1024).toFixed(0)} KB
                      </span>
                      <Loader2 size={14} className="text-brand-400 animate-spin" />
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-brand-400">{item.stageLabel}</span>
                        <span className="text-gray-500">{item.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>

                    {/* Stage steps */}
                    <div className="grid grid-cols-3 gap-1">
                      {PIPELINE_STAGES.filter(s => s.key !== 'done').map((s, idx) => {
                        const currentIdx = STAGE_KEYS.indexOf(item.stage)
                        const sIdx = STAGE_KEYS.indexOf(s.key as PipelineStage)
                        const isPast = sIdx < currentIdx
                        const isCurrent = s.key === item.stage
                        return (
                          <div key={s.key} className="flex items-center gap-1">
                            {isPast
                              ? <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                              : isCurrent
                                ? <Loader2 size={10} className="text-brand-400 animate-spin shrink-0" />
                                : <div className="w-2.5 h-2.5 rounded-full border border-gray-700 shrink-0" />
                            }
                            <span className={`text-[9px] truncate ${isPast ? 'text-emerald-500' : isCurrent ? 'text-brand-400' : 'text-gray-700'
                              }`}>
                              {s.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ── RIGHT: Results ──────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="glass-card p-5">
              <p className="text-sm font-semibold text-gray-200 mb-4">Upload Session</p>
              <div className="space-y-3">
                {[
                  { label: 'Total Uploaded', value: uploads.length, color: 'text-gray-200' },
                  { label: 'Processing', value: processingUploads.length, color: 'text-brand-400' },
                  { label: 'Shortlisted', value: completedUploads.filter(u => u.result?.decision === 'shortlisted').length, color: 'text-emerald-400' },
                  { label: 'Under Review', value: completedUploads.filter(u => u.result?.decision === 'review').length, color: 'text-amber-400' },
                  { label: 'Rejected', value: completedUploads.filter(u => u.result?.decision === 'rejected').length, color: 'text-red-400' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed results */}
            {completedUploads.length > 0 && (
              <div className="glass-card p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-200">
                  Results ({completedUploads.length})
                </p>
                <AnimatePresence>
                  {completedUploads.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-surface-700/50 border border-white/5 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          <span className="text-xs text-gray-300 truncate">
                            {item.filename.replace(/\.[^.]+$/, '')}
                          </span>
                        </div>
                        <button
                          onClick={() => removeUpload(item.id)}
                          className="text-gray-600 hover:text-gray-400 shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {item.result && (
                        <>
                          <div className="flex items-center justify-between">
                            <DecisionBadge decision={item.result.decision} />
                            <span className={`text-sm font-bold ${getScoreColor(item.result.weighted_score)}`}>
                              {item.result.weighted_score.toFixed(1)}
                            </span>
                          </div>

                          {/* Mini score bar */}
                          <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.result.decision === 'shortlisted'
                                  ? 'bg-emerald-500'
                                  : item.result.decision === 'review'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                              style={{ width: `${item.result.weighted_score}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {item.result.structured_data.skills.slice(0, 3).map(s => (
                              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-600 text-gray-400">
                                {s}
                              </span>
                            ))}
                          </div>

                          {item.result.llm_explanation && (
                            <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                              {item.result.llm_explanation}
                            </p>
                          )}
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Empty results state */}
            {uploads.length === 0 && (
              <div className="glass-card p-5 flex flex-col items-center text-center gap-2">
                <Upload size={28} className="text-gray-700" />
                <p className="text-xs text-gray-500">
                  Upload resumes to see AI evaluation results here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}