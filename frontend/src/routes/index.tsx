import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import JobsPage from '@/pages/jobs/JobsPage'
import CandidatesPage from '@/pages/candidates/CandidatesPage'
import CandidateDetailPage from '@/pages/candidates/CandidateDetailPage'
import AuditLogsPage from '@/pages/audit/AuditLogsPage'
import BiasFairnessPage from '@/pages/bias/BiasFairnessPage'
import AIAssistantPage from '@/pages/ai/AIAssistantPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* All app pages rendered inside AppLayout (sidebar + topbar) */}
      <Route element={<AppLayout />}>
        <Route path="dashboard"              element={<DashboardPage />} />
        <Route path="jobs"                   element={<JobsPage />} />
        <Route path="jobs/:jobId"            element={<JobsPage />} />
        <Route path="candidates"             element={<CandidatesPage />} />
        <Route path="candidates/:resumeId"   element={<CandidateDetailPage />} />
        <Route path="ai-assistant"           element={<AIAssistantPage />} />
        <Route path="analytics"              element={<DashboardPage />} />
        <Route path="bias-fairness"          element={<BiasFairnessPage />} />
        <Route path="audit-logs"             element={<AuditLogsPage />} />
        <Route path="review-queue"           element={<CandidatesPage />} />
      </Route>

      {/* Fallback: redirect anything unknown to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}