import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'

interface TopBarProps { title: string; subtitle?: string }

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuthStore()
  return (
    <header className="h-16 bg-surface-800/50 backdrop-blur border-b border-white/5 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1">
        <h1 className="text-base font-semibold text-gray-100">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="w-64">
        <Input placeholder="Search candidates, jobs..." icon={<Search size={14} />} />
      </div>
      <button className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500" />
      </button>
    </header>
  )
}