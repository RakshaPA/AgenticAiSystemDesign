import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GitBranch, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/api'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuthStore()
  const navigate   = useNavigate()
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.login(data.email, data.password)
      const me  = await authApi.me()
      login(me.data, res.data)
      navigate('/dashboard')
    } catch {
      setError('Invalid credentials. Try admin@recruitiq.com / password123')
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(59,130,246,0.08) 0%, #0a0f1e 60%)' }}>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow-blue mb-4">
            <GitBranch size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">RecruitIQ</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise Resume Intelligence Platform</p>
        </div>

        <div className="glass-card p-8 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Sign in</h2>
            <p className="text-sm text-gray-500 mt-1">Access your recruitment dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="recruiter@company.com"
              icon={<Mail size={14} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock size={14} />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </motion.p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Sign In
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <p className="text-xs text-gray-600 text-center">Demo credentials</p>
            {[
              { role: 'Admin',           email: 'admin@recruitiq.com'   },
              { role: 'Recruiter',       email: 'recruiter@recruitiq.com' },
              { role: 'Hiring Manager',  email: 'manager@recruitiq.com' },
              { role: 'Auditor',         email: 'auditor@recruitiq.com' },
            ].map((d) => (
              <div key={d.role} className="flex justify-between text-xs text-gray-600 px-1">
                <span className="text-gray-500">{d.role}</span>
                <span className="font-mono">{d.email}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}