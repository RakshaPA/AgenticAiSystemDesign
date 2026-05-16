import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Briefcase, Users, FileSearch, BarChart3,
  Shield, ScrollText, Bot, GitBranch,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import type { UserRole } from '@/types'

interface NavItem {
  to: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  label: string
  roles?: UserRole[]
  badge?: string
}

const NAV: NavItem[] = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',           icon: Briefcase,       label: 'Job Management', roles: ['admin','recruiter','hiring_manager'] },
  { to: '/candidates',     icon: Users,           label: 'Candidates' },
  { to: '/review-queue',   icon: FileSearch,      label: 'Review Queue',   badge: 'review' },
  { to: '/ai-assistant',   icon: Bot,             label: 'AI Assistant' },
  { to: '/analytics',      icon: BarChart3,       label: 'Analytics' },
  { to: '/bias-fairness',  icon: Shield,          label: 'Bias & Fairness' },
  { to: '/audit-logs',     icon: ScrollText,      label: 'Audit Logs',     roles: ['admin','auditor'] },
]

export function Sidebar() {
  const { user } = useAuthStore()

  // Default to 'recruiter' so role-gated nav items are visible even before login
  const effectiveRole: UserRole = (user?.role as UserRole) ?? 'recruiter'
  const visible = NAV.filter((n) => !n.roles || n.roles.includes(effectiveRole))

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 h-screen flex flex-col bg-surface-800 border-r border-white/5 shrink-0"
    >
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <GitBranch size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-100">RecruitIQ</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Enterprise</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visible.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <div className={isActive ? 'nav-item-active' : 'nav-item'}>
                <item.icon size={16} />
                <span className="flex-1 text-sm">{item.label}</span>
                {isActive && <ChevronRight size={12} className="text-brand-400" />}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        {/* User avatar row */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white">
            R
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">Recruiter</p>
            <p className="text-[10px] text-gray-500 capitalize">recruiter</p>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}