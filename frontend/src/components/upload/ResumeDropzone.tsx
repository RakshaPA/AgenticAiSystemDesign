import { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader, TrendingUp, Brain, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { candidatesApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'

interface EvalResult {
  resume_id: string
  weighted_score: number
  decision: 'shortlisted' | 'review' | 'rejected'
  llm_explanation: string
  bias_fields_removed: string[]
  score_breakdown: {
    required_skills_score: number
    preferred_skills_score: number
    experience_score: number
    project_relevance_score: number
    certification_score: number
    weighted_total: number
  }
  vector_similarity_score: number
}

interface UploadItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  result?: EvalResult
  error?: string
}

const DECISION_CONFIG = {
  shortlisted: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: '✓ Shortlisted' },
  review:      { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: '⏳ Manual Review' },
  rejected:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: '✗ Rejected' },
}

export function ResumeDropzone({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<UploadItem[]>([])

  const update = (index: number, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const uploadFile = async (item: UploadItem, index: number) => {
    update(index, { status: 'uploading' })
    try {
      const res = await candidatesApi.upload(jobId, item.file)
      update(index, { status: 'done', result: res.data as EvalResult })
    } catch (err: any) {
      update(index, { status: 'error', error: err.response?.data?.detail ?? 'Upload failed — is the backend running?' })
    }
  }

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: UploadItem[] = accepted.map((f) => ({ file: f, status: 'pending' }))
    setItems((prev) => {
      const next = [...prev, ...newItems]
      newItems.forEach((_, i) => {
        const idx = prev.length + i
        setTimeout(() => uploadFile(next[idx], idx), i * 400)
      })
      return next
    })
  }, [jobId])

  const inputRef = useRef<HTMLInputElement | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    multiple: true,
  })

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer',
          isDragActive
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
        )}
      >
        <input {...getInputProps()} ref={inputRef} />
        <motion.div animate={{ scale: isDragActive ? 1.05 : 1 }} className="flex flex-col items-center gap-3">
          <Upload size={32} className={isDragActive ? 'text-brand-400' : 'text-gray-600'} />
          <div>
            <p className="text-sm font-medium text-gray-300">
              {isDragActive ? 'Drop resumes here' : 'Drag & drop resumes'}
            </p>
            <p className="text-xs text-gray-600 mt-1">PDF or DOCX • Multiple files supported</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            Browse Files
          </Button>
        </motion.div>
      </div>

      {/* Upload Queue + Results */}
      <AnimatePresence>
        {items.map((item, idx) => (
          <motion.div
            key={`${item.file.name}-${idx}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card overflow-hidden"
          >
            {/* File header row */}
            <div className="flex items-center gap-3 p-4">
              <FileText size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-300 flex-1 truncate">{item.file.name}</span>
              <span className="text-xs text-gray-600">{(item.file.size / 1024).toFixed(0)} KB</span>
              {item.status === 'uploading' && <Loader size={14} className="text-brand-400 animate-spin" />}
              {item.status === 'done'      && <CheckCircle2 size={16} className="text-emerald-400" />}
              {item.status === 'error'     && <AlertCircle  size={16} className="text-red-400" />}
              <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                <X size={14} className="text-gray-600 hover:text-gray-300" />
              </button>
            </div>

            {/* Status messages */}
            {item.status === 'uploading' && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 text-xs text-brand-400">
                  <Loader size={12} className="animate-spin" />
                  Uploading & evaluating resume...
                </div>
              </div>
            )}

            {item.status === 'error' && (
              <div className="px-4 pb-4 text-xs text-red-400">{item.error}</div>
            )}

            {/* Evaluation Result */}
            {item.status === 'done' && item.result && (
              <div className="border-t border-white/5 p-4 space-y-4">
                {/* Decision badge + score */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-xs font-semibold px-3 py-1 rounded-full border',
                    DECISION_CONFIG[item.result.decision].bg,
                    DECISION_CONFIG[item.result.decision].color,
                    DECISION_CONFIG[item.result.decision].border,
                  )}>
                    {DECISION_CONFIG[item.result.decision].label}
                  </span>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-100">{item.result.weighted_score.toFixed(0)}<span className="text-xs text-gray-500">/100</span></p>
                    <p className="text-[10px] text-gray-500">Match Score</p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Required Skills', val: item.result.score_breakdown.required_skills_score },
                    { label: 'Preferred Skills', val: item.result.score_breakdown.preferred_skills_score },
                    { label: 'Experience',       val: item.result.score_breakdown.experience_score },
                    { label: 'Project Fit',      val: item.result.score_breakdown.project_relevance_score },
                    { label: 'Certifications',   val: item.result.score_breakdown.certification_score },
                    { label: 'Similarity',       val: Math.round(item.result.vector_similarity_score * 100) },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between bg-surface-700/50 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] text-gray-500">{label}</span>
                      <span className={cn('text-xs font-semibold', val >= 70 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-red-400')}>
                        {val.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* AI Explanation */}
                {item.result.llm_explanation && (
                  <div className="flex items-start gap-2 bg-brand-500/5 border border-brand-500/10 rounded-lg p-3">
                    <Brain size={13} className="text-brand-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-400">{item.result.llm_explanation}</p>
                  </div>
                )}

                {/* Bias removed */}
                {item.result.bias_fields_removed?.length > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <Shield size={11} className="text-violet-400" />
                    Bias removed: {item.result.bias_fields_removed.join(', ')}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}