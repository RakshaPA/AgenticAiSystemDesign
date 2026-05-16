import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { jobsApi } from '@/lib/api'

interface Props { onClose: () => void }

export function JobCreateModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [reqSkill, setReqSkill]   = useState('')
  const [prefSkill, setPrefSkill] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: '', description: '',
      required_skills: [] as string[],
      preferred_skills: [] as string[],
      min_experience_years: 2,
      shortlist_threshold: 72,
      review_threshold: 50,
    },
  })

  const reqSkills  = watch('required_skills')
  const prefSkills = watch('preferred_skills')

  const addSkill = (type: 'required' | 'preferred') => {
    const val  = type === 'required' ? reqSkill.trim()  : prefSkill.trim()
    const key  = type === 'required' ? 'required_skills' : 'preferred_skills'
    const list = type === 'required' ? reqSkills : prefSkills
    if (val && !list.includes(val)) {
      setValue(key, [...list, val])
      type === 'required' ? setReqSkill('') : setPrefSkill('')
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (data: unknown) => jobsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); onClose() },
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
          className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100">Create New Position</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-5">
            <Input label="Job Title" placeholder="Senior Backend Engineer"
              error={errors.title?.message} {...register('title', { required: 'Required' })} />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400">Job Description</label>
              <textarea
                rows={4} placeholder="Describe the role, responsibilities..."
                className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-brand-500/60 resize-none"
                {...register('description', { required: true })}
              />
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">Required Skills</label>
              <div className="flex gap-2">
                <Input placeholder="Python, FastAPI..." value={reqSkill}
                  onChange={(e) => setReqSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('required'))} />
                <Button type="button" variant="secondary" size="sm" onClick={() => addSkill('required')}>
                  <Plus size={14} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {reqSkills.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {s}
                    <button type="button" onClick={() => setValue('required_skills', reqSkills.filter(x => x !== s))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Preferred Skills */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">Preferred Skills</label>
              <div className="flex gap-2">
                <Input placeholder="Docker, Kubernetes..." value={prefSkill}
                  onChange={(e) => setPrefSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('preferred'))} />
                <Button type="button" variant="secondary" size="sm" onClick={() => addSkill('preferred')}>
                  <Plus size={14} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {prefSkills.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {s}
                    <button type="button" onClick={() => setValue('preferred_skills', prefSkills.filter(x => x !== s))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-3 gap-4">
              <Input label="Min Experience (yrs)" type="number" step="0.5"
                {...register('min_experience_years', { valueAsNumber: true })} />
              <Input label="Shortlist Threshold (%)" type="number"
                {...register('shortlist_threshold', { valueAsNumber: true })} />
              <Input label="Review Threshold (%)" type="number"
                {...register('review_threshold', { valueAsNumber: true })} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={isPending}>Create Position</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}