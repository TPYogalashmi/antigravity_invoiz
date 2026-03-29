import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../store/useAuthStore'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { backendClient } from '../api/axios'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // ── Call real backend login endpoint
      const response = await backendClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      })

      // Extract token and user from response
      const { accessToken, user } = response.data.data

      setAuth({
        token: accessToken,
        user,
      })
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-dm">
      {/* ── Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 border-r border-slate-800 p-12 relative overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-xl shadow-cyan-500/30">
            <Zap size={20} className="text-slate-950" fill="currentColor" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white font-syne">Invoiz</span>
            <span className="block text-[10px] text-slate-500 tracking-widest uppercase">CRM Pro</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-5">
          <h2 className="font-syne text-4xl font-bold text-white">
            Voice-First Billing Engine.<br></br>
            <span className="text-cyan-400 text-[20px]">Stop typing invoices. Start speaking them</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Create invoices in seconds using voice commands, while seamlessly managing customers and inventory through an intuitive interface.
          </p>
          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {['Voice to Invoice', 'Product & inventory handling', 'Reports & analytics ', 'Real-time speech processing', 'Smart CRM', 'Real-time Billing'].map((f) => (
              <span key={f} className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom testimonial */}
        <div className="relative p-4 rounded-xl bg-slate-800/60 border border-slate-700 backdrop-blur-sm">
          <p className="text-sm text-slate-300 italic">
            "Increased sales by 30% and reduced invoice processing time by 50% in the first month."
          </p>
          <p className="mt-2 text-xs text-slate-500">— Rahul K., Reliance Retail</p>
        </div>
      </div>

      {/* ── Right panel: Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Zap size={17} className="text-slate-950" fill="currentColor" />
            </div>
            <span className="text-base font-bold text-white font-syne">VoiceBill CRM</span>
          </div>

          <h1 className="font-syne text-2xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-8">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="admin@billingcrm.com"
                {...register('email')}
                className={`
                  w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-sm text-slate-200 placeholder-slate-600
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition
                  ${errors.email ? 'border-rose-500/60' : 'border-slate-800 focus:border-cyan-500/60'}
                `}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`
                    w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-900 border text-sm text-slate-200 placeholder-slate-600
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition
                    ${errors.password ? 'border-rose-500/60' : 'border-slate-800 focus:border-cyan-500/60'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div >
  )
}