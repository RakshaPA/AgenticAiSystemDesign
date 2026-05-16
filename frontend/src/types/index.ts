// ── Auth ────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'recruiter' | 'hiring_manager' | 'auditor'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  department?: string
  lastActive?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

// ── Jobs ────────────────────────────────────────────────────────────────────
export interface JobDescription {
  id: string
  title: string
  description: string
  required_skills: string[]
  preferred_skills: string[]
  min_experience_years: number
  required_certifications: string[]
  shortlist_threshold: number
  review_threshold: number
  created_at: string
  status: 'active' | 'paused' | 'closed'
  total_applications?: number
  shortlisted?: number
}

// ── Scoring ─────────────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  required_skills_score: number
  preferred_skills_score: number
  experience_score: number
  project_relevance_score: number
  certification_score: number
  weighted_total: number
}

export type DecisionStatus = 'shortlisted' | 'review' | 'rejected'

// ── Candidate / Resume ───────────────────────────────────────────────────────
export interface StructuredResume {
  skills: string[]
  experience_years: number
  experience_entries: { role: string; company: string; duration_months: number; description: string }[]
  projects: { name: string; tech_stack: string[]; description: string }[]
  certifications: string[]
  education: { degree: string; field: string; institution: string }[]
  summary: string
}

export interface Candidate {
  id: string
  resume_id: string
  job_id: string
  original_filename: string
  structured_data: StructuredResume
  bias_scrubbed_fields: string[]
  vector_similarity_score: number
  weighted_score: number
  score_breakdown: ScoreBreakdown
  decision: DecisionStatus
  llm_explanation?: string
  guardrail_violations: string[]
  uploaded_at: string
  evaluated_at?: string
}

// ── Audit ────────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  resume_id: string
  job_id: string
  decision: DecisionStatus
  vector_similarity_score: number
  weighted_score: number
  score_breakdown: ScoreBreakdown
  bias_fields_removed: string[]
  guardrail_violations: string[]
  llm_explanation?: string
  reviewer_override: boolean
  reviewer_notes?: string
  created_at: string
}

// ── Pipeline Events (WebSocket/SSE) ──────────────────────────────────────────
export type PipelineStage =
  | 'uploading' | 'extracting' | 'scrubbing_bias' | 'parsing'
  | 'embedding' | 'similarity_matching' | 'scoring' | 'explaining' | 'done' | 'error'

export interface PipelineEvent {
  resume_id: string
  stage: PipelineStage
  progress: number          // 0-100
  message: string
  data?: Record<string, unknown>
}

// ── Analytics ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_applications: number
  shortlisted: number
  in_review: number
  rejected: number
  avg_match_score: number
  avg_processing_time_ms: number
  shortlist_rate: number
}

export interface HiringTrendPoint {
  date: string
  applications: number
  shortlisted: number
  rejected: number
}

export interface SkillFrequency {
  skill: string
  count: number
  match_rate: number
}