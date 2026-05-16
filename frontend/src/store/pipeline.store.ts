import { create } from 'zustand'
import type { PipelineEvent } from '@/types'

interface PipelineState {
  events: Record<string, PipelineEvent>   // keyed by resume_id
  addEvent: (event: PipelineEvent) => void
  clearEvent: (resumeId: string) => void
  clearAll: () => void
}

export const usePipelineStore = create<PipelineState>((set) => ({
  events: {},
  addEvent: (event) =>
    set((s) => ({ events: { ...s.events, [event.resume_id]: event } })),
  clearEvent: (id) =>
    set((s) => {
      const e = { ...s.events }
      delete e[id]
      return { events: e }
    }),
  clearAll: () => set({ events: {} }),
}))