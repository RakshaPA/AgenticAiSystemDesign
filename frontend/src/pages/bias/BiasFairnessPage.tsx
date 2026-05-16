import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, CheckCircle, BarChart2, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

const CHART_TOOLTIP = {
  contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
}

export default function BiasFairnessPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Bias & Fairness" subtitle="Transparency and fairness monitoring dashboard" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Guardian stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: EyeOff,      label: 'Fields Scrubbed',    value: '14,832', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: Shield,      label: 'Guardrail Triggers',  value: '47',     color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
            { icon: CheckCircle, label: 'Clean Evaluations',   value: '98.6%',  color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
            { icon: Eye,         label: 'Reviewer Overrides',  value: '23',     color: 'text-violet-400',  bg: 'bg-violet-500/10'  },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="stat-card">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Removed PII types */}
          <Card className="p-5">
            <CardHeader><CardTitle className="flex items-center gap-2"><EyeOff size={15} /> PII Fields Removed</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={PII_DATA} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="field" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Score distribution by decision */}
          <Card className="p-5">
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 size={15} /> Score Distribution by Decision</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={SCORE_DIST}>
                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="shortlisted" fill="#10b981" radius={[4, 4, 0, 0]} name="Shortlisted" />
                <Bar dataKey="review"      fill="#f59e0b" radius={[4, 4, 0, 0]} name="Review" />
                <Bar dataKey="rejected"    fill="#ef4444" radius={[4, 4, 0, 0]} name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Fairness drift over time */}
          <Card className="p-5 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp size={15} /> Guardrail Trigger Trend</CardTitle>
              <span className="text-xs text-gray-500">Bias drift monitoring — last 30 days</span>
            </CardHeader>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={DRIFT_DATA}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line type="monotone" dataKey="violations" stroke="#f59e0b" strokeWidth={2} dot={false} name="Violations" />
                <Line type="monotone" dataKey="overrides"  stroke="#8b5cf6" strokeWidth={2} dot={false} name="Overrides" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Explainability section */}
        <Card className="p-5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Eye size={15} /> Evaluation Transparency</CardTitle></CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Pre-Evaluation', items: ['Name redacted', 'Gender removed', 'DOB scrubbed', 'Address removed', 'Phone/Email removed'] },
              { title: 'Evaluation Signals', items: ['Skills match ×0.35', 'Experience ×0.25', 'Preferred skills ×0.20', 'Projects ×0.12', 'Certs ×0.08'] },
              { title: 'Decision Rules', items: ['≥72 → Shortlisted', '50–71 → Review queue', '<50 → Rejected', 'Sim<0.30 → Auto-reject', 'Override logged + audited'] },
            ].map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{section.title}</p>
                {section.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

const PII_DATA = [
  { field: 'Email Address',   count: 3842 },
  { field: 'Phone Number',    count: 3791 },
  { field: 'Street Address',  count: 2234 },
  { field: 'Date of Birth',   count: 1892 },
  { field: 'Gender',          count: 1203 },
  { field: 'Nationality',     count: 987  },
  { field: 'LinkedIn URL',    count: 883  },
]
const SCORE_DIST = [
  { range: '0-30',   shortlisted: 0, review: 5,   rejected: 78  },
  { range: '31-50',  shortlisted: 0, review: 23,  rejected: 145 },
  { range: '51-71',  shortlisted: 0, review: 198, rejected: 12  },
  { range: '72-85',  shortlisted: 67, review: 0,  rejected: 0   },
  { range: '86-100', shortlisted: 22, review: 0,  rejected: 0   },
]
const DRIFT_DATA = Array.from({ length: 14 }, (_, i) => ({
  date: `May ${i + 1}`, violations: Math.floor(Math.random() * 5), overrides: Math.floor(Math.random() * 3),
}))