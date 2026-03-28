import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import {
  LayoutDashboard,
  FileText,
  Users,
  Mic,
  Package,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/voice-billing', label: 'Voice Billing', icon: Mic },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-dm">

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col
          bg-slate-900 border-r border-slate-800
          transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap size={16} className="text-slate-950" fill="currentColor" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white font-syne">Invoiz</span>
            <span className="block text-[10px] text-slate-500 tracking-widest uppercase">CRM Pro</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
            Main Menu
          </p>
          {navItems.map((item) => {
            const { to, label } = item;
            const Icon = item.icon;

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
        ${isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                    {label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all duration-150"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOPBAR ── */}
        <header className="shrink-0 flex items-center gap-4 px-4 md:px-6 h-16 bg-slate-900 border-b border-slate-800 z-[100] relative">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb / title area */}
          <div className="hidden sm:block">
            <p className="text-xs text-slate-500 font-syne font-bold uppercase tracking-widest text-slate-600">Voice-Enabled Billing</p>
          </div>

          <div className="ml-auto flex items-center gap-3">

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all border ${profileOpen ? 'bg-slate-800 border-slate-700 shadow-lg shadow-black/20' : 'hover:bg-slate-800 border-transparent hover:border-slate-700'}`}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow shadow-cyan-500/30">
                  {user?.name?.[0]?.toUpperCase() ?? 'A'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name ?? 'Admin User'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-widest leading-none">{user?.role ?? 'Owner'}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-500 hidden md:block transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-x-0 bottom-0 top-16 z-[90] bg-slate-950/20" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-3 w-64 bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[110] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="px-6 py-5 border-b border-slate-800 bg-slate-800/40">
                      <p className="text-sm font-bold text-white tracking-tight">{user?.name ?? 'Admin User'}</p>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">{user?.role ?? 'Owner'}</p>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                        className="flex items-center gap-4 w-full px-4 py-3.5 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition-all rounded-2xl group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-cyan-500/10 transition">
                          <Users size={16} />
                        </div>
                        Profile Page
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 w-full px-4 py-3.5 text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-all rounded-2xl mt-1 group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-rose-500/20 transition">
                          <LogOut size={16} />
                        </div>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}