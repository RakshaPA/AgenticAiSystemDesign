import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, AlertTriangle, BookOpen, Briefcase, Award, Code2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DecisionBadge, Badge } from '@/components/ui/Badge'
import { ScoreBreakdownCard } from '@/components/candidates/ScoreBreakdownCard'
import { CandidateRadarChart } from '@/components/candidates/CandidatesRadarChart'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Candidate } from '@/types'

// Mock — replace with useQuery + candidatesApi.get(resumeId)
const getMockCandidate = (id: string): Candidate => ({
  id, resume_id: id, job_id: '1',
  original_filename: 'candidate_resume.pdf',
  structured_data: {
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis', 'LangChain', 'pgvector'],
    experience_years: 5.5,
    experience_entries: [
      { role: 'Senior Backend Engineer', company: '[COMPANY REDACTED]', duration_months: 24, description: 'Built microservices architecture serving 10M+ requests/day.' },
      { role: 'Software Engineer',       company: '[COMPANY REDACTED]', duration_months: 18, description: 'Developed REST APIs and PostgreSQL schemas for fintech platform.' },
    ],
    projects: [
      { name: 'AI Pipeline Orchestrator', tech_stack: ['Python', 'LangChain', 'Redis'], description: 'Designed multi-agent LLM pipeline processing 50K documents/day.' },
      { name: 'Vector Search Engine',     tech_stack: ['pgvector', 'FastAPI', 'Docker'], description: 'Built semantic search over 1M+ embeddings with <50ms latency.' },
    ],
    certifications: ['AWS Solutions Architect', 'Google Cloud Professional'],
    education: [{ degree: 'B.Tech', field: 'Computer Science', institution: '[INSTITUTION REDACTED]' }],
    summary: 'Experienced backend engineer specializing in AI-powered systems and high-throughput APIs.',
  },
  bias_scrubbed_fields: ['email address', 'phone number', 'date of birth', 'street address'],
  vector_similarity_score: 0.87,
  weighted_score: 81.4,
  score_breakdown: {
    required_skills_score: 92.0, preferred_skills_score: 78.0,
    experience_score: 88.0,      project_relevance_score: 83.0,
    certification_score: 75.0,   weighted_total: 81.4,
  },
  decision: 'shortlisted',
  llm_explanation: 'Shortlisted. Candidate demonstrates strong alignment with required backend skills (92% match), particularly Python, FastAPI, and PostgreSQL. 5.5 years of experience exceeds the 4-year minimum. Projects show direct relevance to AI pipeline architecture, with demonstrated experience building vector search systems. AWS certification adds credibility.',
  guardrail_violations: [],
  uploaded_at: new Date().toISOString(),
  evaluated_at: new Date().toISOString(),
})

export default function CandidateDetailPage() {
  const { resumeId } = useParams<{ resumeId: string }>()
  const navigate     = useNavigate()
  const candidate    = getMockCandidate(resumeId!)
  const { structured_data: sd, score_breakdown: sb } = candidate

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Candidate Profile" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Back + Header */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-5 transition-colors">
          <ArrowLeft size={14} /> Back to Candidates
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left — overview */}
          <div className="xl:col-span-2 space-y-5">
            {/* Header card */}
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xl font-bold text-brand-400">
                    {resumeId?.slice(-1).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-100">Candidate #{resumeId?.slice(-4)}</h2>
                    <p className="text-sm text-gray-500">{sd.experience_years} years experience • {sd.education[0]?.field}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <DecisionBadge decision={candidate.decision} />
                      <Badge variant="info">{(candidate.vector_similarity_score * 100).toFixed(0)}% similar</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-brand-400">{candidate.weighted_score.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">Weighted Score</p>
                </div>
              </div>

              {/* AI Explanation */}
              {candidate.llm_explanation && (
                <div className="mt-4 p-4 bg-brand-500/5 border border-brand-500/20 rounded-lg">
                  <p className="text-xs font-medium text-brand-400 mb-2 flex items-center gap-2">
                    <span>🤖</span> AI Evaluation Summary
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{candidate.llm_explanation}</p>
                </div>
              )}
            </Card>

            {/* Skills */}
            <Card className="p-5">
              <CardHeader><CardTitle className="flex items-center gap-2"><Code2 size={15} /> Skills</CardTitle></CardHeader>
              <div className="flex flex-wrap gap-2">
                {sd.skills.map((skill) => (
                  <span key={skill} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </Card>

            {/* Experience */}
            <Card className="p-5">
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase size={15} /> Experience</CardTitle></CardHeader>
              <div className="space-y-4">
                {sd.experience_entries.map((exp, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-400 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">{exp.role}</p>
                      <p className="text-xs text-gray-500">{exp.company} • {Math.round(exp.duration_months / 12 * 10) / 10} years</p>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Projects */}
            <Card className="p-5">
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen size={15} /> Projects</CardTitle></CardHeader>
              <div className="space-y-4">
                {sd.projects.map((proj, i) => (
                  <div key={i} className="p-3 bg-surface-700 rounded-lg">
                    <p className="text-sm font-medium text-gray-200">{proj.name}</p>
                    <div className="flex gap-1.5 flex-wrap mt-1.5 mb-2">
                      {proj.tech_stack.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{proj.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Certifications */}
            {sd.certifications.length > 0 && (
              <Card className="p-5">
                <CardHeader><CardTitle className="flex items-center gap-2"><Award size={15} /> Certifications</CardTitle></CardHeader>
                <div className="space-y-2">
                  {sd.certifications.map((c) => (
                    <div key={c} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-emerald-400">✓</span> {c}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right — scoring */}
          <div className="space-y-5">
            <ScoreBreakdownCard breakdown={sb} />

            <Card className="p-5">
              <CardHeader><CardTitle>Score Radar</CardTitle></CardHeader>
              <CandidateRadarChart breakdown={sb} />
            </Card>

            {/* Similarity */}
            <Card className="p-5">
              <CardHeader><CardTitle>Semantic Similarity</CardTitle></CardHeader>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">JD Match</span>
                  <span className="text-lg font-bold text-brand-400">
                    {(candidate.vector_similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
                <ProgressBar value={candidate.vector_similarity_score * 100}
                  showValue={false} color="from-brand-500 to-violet-500" />
                <p className="text-xs text-gray-600">Vector cosine similarity vs job description embedding</p>
              </div>
            </Card>

            {/* Bias Transparency */}
            <Card className="p-5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield size={15} className="text-emerald-400" /> Bias Transparency</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">Fields removed before evaluation:</p>
                {candidate.bias_scrubbed_fields.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-emerald-400">
                    <span>✓</span> <span className="capitalize">{f}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Guardrail Violations */}
            {candidate.guardrail_violations.length > 0 && (
              <Card className="p-5 border border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-400" /> Guardrail Flags
                  </CardTitle>
                </CardHeader>
                <div className="space-y-2">
                  {candidate.guardrail_violations.map((v, i) => (
                    <p key={i} className="text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1.5">{v}</p>
                  ))}
                </div>
              </Card>
            )}

            {/* Reviewer Actions */}
            {candidate.decision === 'review' && (
              <Card className="p-5">
                <CardHeader><CardTitle>Recruiter Decision</CardTitle></CardHeader>
                <div className="space-y-2">
                  <Button variant="primary" className="w-full" size="sm">✓ Approve & Shortlist</Button>
                  <Button variant="danger"  className="w-full" size="sm">✕ Reject Candidate</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}