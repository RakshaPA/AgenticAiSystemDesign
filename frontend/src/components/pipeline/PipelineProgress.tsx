import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react'
import { usePipelineStore } from '@/store/pipeline.store'
import { PIPELINE_STAGES } from '@/lib/utils'
import type { PipelineStage } from '@/types'

function stageIndex(stage: PipelineStage) {
  return PIPELINE_STAGES.findIndex((s) => s.key === stage)
}

interface PipelineProgressProps { resumeId: string }

export function PipelineProgress({ resumeId }: PipelineProgressProps) {
  const event = usePipelineStore((s) => s.events[resumeId])
  if (!event) return null

  const currentIdx = stageIndex(event.stage)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="glass-card p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-200">Processing Resume</p>
          <span className="text-xs text-gray-500">{event.progress}%</span>
        </div>

        {/* Overall bar */}
        <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
            animate={{ width: `${event.progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Stage steps */}
        <div className="space-y-2">
          {PIPELINE_STAGES.filter(s => s.key !== 'done').map((stage, idx) => {
            const isPast    = idx < currentIdx
            const isCurrent = stage.key === event.stage
            const isFuture  = idx > currentIdx

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isPast    && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {isCurrent && event.stage === 'error'
                    ? <XCircle size={16} className="text-red-400" />
                    : isCurrent
                      ? <Loader2 size={16} className="text-brand-400 animate-spin" />
                      : null}
                  {isFuture  && <Clock size={14} className="text-gray-600" />}
                </div>
                <span className={`text-xs ${isPast ? 'text-emerald-400' : isCurrent ? 'text-brand-300' : 'text-gray-600'}`}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>

        {event.message && (
          <p className="text-xs text-gray-500 italic">{event.message}</p>
        )}
      </motion.div>
    </AnimatePresence>
  )
}