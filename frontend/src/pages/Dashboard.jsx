import { TrendingUp, Users, FileText, DollarSign, Mic, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const stats = [
  {
    label: 'Total Revenue',
    value: '$48,295',
    change: '+12.5%',
    up: true,
    icon: DollarSign,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    label: 'Active Customers',
    value: '1,284',
    change: '+4.3%',
    up: true,
    icon: Users,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    label: 'Pending Invoices',
    value: '37',
    change: '-8.1%',
    up: false,
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    label: 'Voice Sessions',
    value: '214',
    change: '+29.4%',
    up: true,
    icon: Mic,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
]

const recentInvoices = [
  { id: 'INV-0041', customer: 'Apex Corp',       amount: '$3,200', status: 'Paid',    date: 'Mar 20' },
  { id: 'INV-0040', customer: 'NovaTech Ltd',    amount: '$1,875', status: 'Pending', date: 'Mar 19' },
  { id: 'INV-0039', customer: 'BlueWave Inc',    amount: '$5,040', status: 'Paid',    date: 'Mar 18' },
  { id: 'INV-0038', customer: 'Stark Solutions', amount: '$920',   status: 'Overdue', date: 'Mar 15' },
  { id: 'INV-0037', customer: 'Orion Ventures',  amount: '$2,400', status: 'Paid',    date: 'Mar 14' },
]

const statusStyles = {
  Paid:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export default function Dashboard() {
  return (
    <div className="space-y-6 font-dm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back — here's what's happening today.</p>
        </div>
        <span className="hidden sm:block text-xs text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((item) => {
  const { label, value, change, up, color, bg, border } = item;
  const Icon = item.icon;

  return (
    <div key={label} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-lg ${bg} border ${border} flex items-center justify-center`}>
          <Icon size={17} className={color} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white font-syne">{value}</p>
        <div className={`inline-flex items-center gap-1 mt-1 text-xs font-medium ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {change} vs last month
        </div>
      </div>
    </div>
  );
})}
      </div>

      {/* Recent Invoices */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Recent Invoices</h2>
          </div>
          <a href="/invoices" className="text-xs text-cyan-400 hover:text-cyan-300 transition font-medium">
            View all →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Invoice', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition ${
                    i === recentInvoices.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-cyan-400">{inv.id}</td>
                  <td className="px-5 py-3.5 text-slate-300 font-medium">{inv.customer}</td>
                  <td className="px-5 py-3.5 text-slate-200 font-semibold">{inv.amount}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${statusStyles[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}