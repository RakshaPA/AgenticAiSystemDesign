import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

export const api = axios.create({
  baseURL: 'http://localhost:8000',
})

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: () => api.get('/jobs'),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: unknown) => api.post('/jobs', data),
  update: (id: string, data: unknown) => api.put(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
}

// ── Candidates ────────────────────────────────────────────────────────────────
export const candidatesApi = {
  list: (jobId: string, params?: Record<string, unknown>) =>
    api.get(`/jobs/${jobId}/resumes`, { params }),
  get: (resumeId: string) => api.get(`/resumes/${resumeId}`),
  shortlist: (jobId: string) => api.get(`/jobs/${jobId}/shortlist`),
  reviewQueue: (jobId: string) => api.get(`/jobs/${jobId}/review-queue`),
  submitReview: (resumeId: string, data: { decision: string; notes?: string }) =>
    api.patch(`/resumes/${resumeId}/review`, data),
  upload: (jobId: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/jobs/${jobId}/resumes`, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
  },
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  get: (resumeId: string) => api.get(`/audit/${resumeId}`),
  list: (params?: Record<string, unknown>) => api.get('/audit', { params }),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: (jobId?: string) => api.get('/analytics/dashboard', { params: { job_id: jobId } }),
  hiringTrends: (days = 30) => api.get('/analytics/trends', { params: { days } }),
  skillDistribution: (jobId?: string) =>
    api.get('/analytics/skills', { params: { job_id: jobId } }),
  fairnessMetrics: () => api.get('/analytics/fairness'),
}