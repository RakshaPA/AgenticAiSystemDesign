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

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q, timestamp: new Date() }])
    setLoading(true)
    // TODO: wire to actual AI assistant API
    await new Promise((r) => setTimeout(r, 1200))
    setMessages((m) => [...m, {
      role: 'assistant',
      content: `I found 12 candidates matching "${q}". The top match has a weighted score of 87.4 with Python, FastAPI, and 6 years of experience. Would you like me to shortlist them or show detailed profiles?`,
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