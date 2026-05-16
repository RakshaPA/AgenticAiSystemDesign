import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, User, Sparkles } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date }

const QUICK_PROMPTS = [
  'Find candidates with FastAPI and 4+ years experience',
  'Show shortlisted candidates for ML Engineer role',
  'Compare top 3 backend candidates by score',
  'Which candidates have AWS certifications?',
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI recruiting assistant. Ask me to find, filter, or compare candidates using natural language.', timestamp: new Date() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const generateResponse = (q: string): string => {
    const lower = q.toLowerCase()

    if (lower.includes('shortlist') && lower.includes('ml')) {
      return '📋 Found 8 shortlisted candidates for the ML Engineer role. Top picks:\n\n1. Alex M. — Score: 91.2 · PyTorch, MLflow, 5 yrs\n2. Priya S. — Score: 88.7 · scikit-learn, Kubeflow, 4 yrs\n3. James L. — Score: 85.4 · TensorFlow, FAISS, 6 yrs\n\nWould you like me to export these profiles or schedule interviews?'
    }
    if (lower.includes('shortlist')) {
      return '📋 Currently 32 candidates are shortlisted across all roles. The highest scorer is in the Senior Backend Engineer role with 94.1. Want me to filter by a specific role?'
    }
    if (lower.includes('fastapi') || lower.includes('backend')) {
      return '🔍 Found 14 candidates with FastAPI experience. Filtering for 4+ years:\n\n1. Rohan K. — Score: 89.3 · FastAPI, PostgreSQL, Docker, 6 yrs\n2. Sara W. — Score: 86.1 · FastAPI, Redis, pgvector, 4.5 yrs\n3. Dev P. — Score: 82.5 · FastAPI, SQLAlchemy, Celery, 4 yrs\n\nAll three meet the shortlist threshold (≥72). Shall I shortlist them?'
    }
    if (lower.includes('compare') || lower.includes('top 3') || lower.includes('top3')) {
      return '⚖️ Top 3 candidates comparison:\n\n| Candidate | Score | Key Skills | Experience |\n|-----------|-------|------------|------------|\n| Rohan K.  | 89.3  | FastAPI, Docker | 6 yrs |\n| Sara W.   | 86.1  | FastAPI, Redis | 4.5 yrs |\n| Dev P.    | 82.5  | FastAPI, SQLAlchemy | 4 yrs |\n\nAll three scored above the shortlist threshold. Rohan leads in required skills match (94%).'
    }
    if (lower.includes('aws') || lower.includes('certif')) {
      return '🏅 Found 6 candidates with AWS certifications:\n\n• 3 with AWS ML Specialty (required for ML Engineer role)\n• 2 with AWS Solutions Architect\n• 1 with AWS DevOps Engineer\n\nAll 3 ML Specialty holders are currently in the review queue. Want me to fast-track them?'
    }
    if (lower.includes('reject') || lower.includes('rejected')) {
      return '📊 78 candidates have been rejected across all roles. Rejection reasons:\n• Below required skills threshold (42%)\n• Insufficient experience (31%)\n• Score below minimum cutoff (27%)\n\nWould you like me to flag any borderline rejections (score 45–50) for manual review?'
    }
    if (lower.includes('bias') || lower.includes('fair')) {
      return '⚖️ Bias & Fairness report:\n\n• Gender parity score: 0.94 ✅\n• Age bias score: 0.89 ✅\n• Location bias score: 0.91 ✅\n• Fields scrubbed: name, email, phone, address, DOB\n\nAll screening decisions pass guardrail checks. No flagged violations in the last 7 days.'
    }
    if (lower.includes('score') || lower.includes('ranking')) {
      return '📈 Score distribution across all candidates:\n\n• ≥72 (Shortlisted): 32 candidates (25.6%)\n• 50–71 (Review): 15 candidates (12%)\n• <50 (Rejected): 78 candidates (62.4%)\n\nAverage weighted score: 68.5. The top scorer has 94.1 in the Senior Backend Engineer role.'
    }
    if (lower.includes('python') || lower.includes('react') || lower.includes('typescript')) {
      const skill = lower.includes('python') ? 'Python' : lower.includes('react') ? 'React' : 'TypeScript'
      return `🔍 Candidates with ${skill} experience:\n\n• Total matches: ${skill === 'Python' ? 34 : skill === 'React' ? 28 : 14}\n• Average score: ${skill === 'Python' ? '75.2' : skill === 'React' ? '71.4' : '69.8'}\n• Shortlisted: ${skill === 'Python' ? 9 : skill === 'React' ? 7 : 4}\n\nWant me to further filter by experience level or additional skills?`
    }
    // default helpful fallback
    return `🤔 I searched for "${q}" but need a bit more context to give you a precise answer. Try asking me to:\n\n• "Find candidates with [skill] and [X]+ years experience"\n• "Show shortlisted candidates for [role]"\n• "Compare top candidates by score"\n• "Which candidates have [certification]?"\n• "Show bias and fairness report"`
  }

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q, timestamp: new Date() }])
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setMessages((m) => [...m, {
      role: 'assistant',
      content: generateResponse(q),
      timestamp: new Date(),
    }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="AI Recruiter Assistant" subtitle="Natural language candidate search and analysis" />

      <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors">
              {p}
            </button>
          ))}
        </div>

        {/* Messages */}
        <Card className="flex-1 overflow-y-auto p-4 space-y-4" animate={false}>
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-brand-400" />
                  </div>
                )}
                <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-surface-700 text-gray-200 rounded-tl-sm border border-white/5'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-surface-600 border border-white/10 flex items-center justify-center shrink-0">
                    <User size={14} className="text-gray-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                <Sparkles size={14} className="text-brand-400 animate-pulse" />
              </div>
              <div className="bg-surface-700 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5">
                <div className="flex gap-1">
                  {[0,1,2].map((i) => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500"
                      animate={{ y: [0, -4, 0] }} transition={{ delay: i * 0.1, repeat: Infinity, duration: 0.6 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </Card>

        {/* Input */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Ask about candidates, skills, scores, or roles..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            />
          </div>
          <Button onClick={() => send()} disabled={!input.trim() || loading} size="md">
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  )
}