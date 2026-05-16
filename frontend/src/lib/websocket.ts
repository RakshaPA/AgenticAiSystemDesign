import { usePipelineStore } from '@/store/pipeline.store'
import type { PipelineEvent } from '@/types'

let ws: WebSocket | null = null

export function connectPipelineSocket(jobId: string) {
  const token = localStorage.getItem('recruitiq-auth')
    ? JSON.parse(localStorage.getItem('recruitiq-auth')!).state?.tokens?.access_token
    : null

  ws = new WebSocket(`ws://localhost:8000/ws/pipeline/${jobId}?token=${token}`)

  ws.onmessage = (msg) => {
    try {
      const event: PipelineEvent = JSON.parse(msg.data)
      usePipelineStore.getState().addEvent(event)
    } catch (_) {}
  }

  ws.onclose = () => { ws = null }
  return ws
}

export function disconnectPipelineSocket() {
  ws?.close()
  ws = null
}