import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Users, CheckCircle, Clock, XCircle, TrendingUp, Zap } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { analyticsApi } from '@/lib/api'

const STAT_CARDS = [
  { key: 'total_applications', label: 'Total Applications', icon: Users,        color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
  { key: 'shortlisted',        label: 'Shortlisted',        icon: CheckCircle,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'in_review',          label: 'Pending Review',     icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
  { key: 'rejected',           label: 'Rejected',           icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10'    },
  { key: 'avg_match_score',    label: 'Avg Match Score',    icon: TrendingUp,   color: 'text-violet-400',  bg: 'bg-violet-500/10', suffix: '%' },
  { key: 'shortlist_rate',     label: 'Shortlist Rate',     icon: Zap,          color: 'text-cyan-400',    bg: 'bg-cyan-500/10',   suffix: '%' },
]

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
  itemStyle: { color: '#cbd5e1', fontSize: 11 },
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data),
  })
  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: () => analyticsApi.hiringTrends().then(r => r.data),
  })
  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => analyticsApi.skillDistribution().then(r => r.data),
  })

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Dashboard" subtitle="Recruitment intelligence overview" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAT_CARDS.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {isLoading ? <SkeletonCard /> : (
                <div className="stat-card">
                  <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon size={18} className={card.color} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">
                      {stats?.[card.key as keyof typeof stats] ?? '--'}
                      {card.suffix}
                    </p>
                    <p className="text-xs text-gray-500">{card.label}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Hiring Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <CardHeader>
              <CardTitle>Hiring Trends</CardTitle>
              <span className="text-xs text-gray-500">Last 30 days</span>
            </CardHeader>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trends ?? MOCK_TRENDS}>
                <defs>
                  <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="shortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="applications" stroke="#3b82f6" fill="url(#appGrad)" strokeWidth={2} name="Applications" />
                <Area type="monotone" dataKey="shortlisted"  stroke="#10b981" fill="url(#shortGrad)" strokeWidth={2} name="Shortlisted" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Score Distribution */}
          <Card className="p-5">
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <span className="text-xs text-gray-500">All candidates</span>
            </CardHeader>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MOCK_SCORE_DIST}>
                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {MOCK_SCORE_DIST.map((entry, i) => (
                    <Cell key={i} fill={entry.range === '72-100' ? '#10b981' : entry.range === '50-71' ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Skill Distribution + Decision Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Skills in Talent Pool</CardTitle>
            </CardHeader>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={skills?.slice(0, 10) ?? MOCK_SKILLS} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <CardHeader><CardTitle>Decision Split</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={MOCK_PIE} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {MOCK_PIE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Mock data (replace with real API data)
const MOCK_TRENDS = Array.from({ length: 14 }, (_, i) => ({
  date: `May ${i + 1}`,
  applications: Math.floor(Math.random() * 80 + 40),
  shortlisted: Math.floor(Math.random() * 20 + 5),
}))
const MOCK_SCORE_DIST = [
  { range: '0-29',  count: 45 },
  { range: '30-49', count: 120 },
  { range: '50-71', count: 210 },
  { range: '72-100', count: 89 },
]
const MOCK_SKILLS = [
  { skill: 'Python',    count: 342 }, { skill: 'React',      count: 289 },
  { skill: 'FastAPI',   count: 198 }, { skill: 'PostgreSQL', count: 176 },
  { skill: 'Docker',    count: 154 }, { skill: 'TypeScript', count: 143 },
  { skill: 'AWS',       count: 132 }, { skill: 'LangChain',  count: 98  },
  { skill: 'Redis',     count: 87  }, { skill: 'GraphQL',    count: 72  },
]
const MOCK_PIE = [
  { name: 'Shortlisted', value: 89,  color: '#10b981' },
  { name: 'In Review',   value: 210, color: '#f59e0b' },
  { name: 'Rejected',    value: 165, color: '#ef4444' },
]