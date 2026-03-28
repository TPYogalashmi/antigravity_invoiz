import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Receipt,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Users,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { backendClient } from '../api/axios';

const fetchDashboardStats = async () => {
  const { data } = await backendClient.get('/dashboard/stats');
  return data.data;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 60000, // Refresh every minute
  });

  React.useEffect(() => {
    const refreshOverdue = async () => {
      try {
        await backendClient.post('/invoices/refresh-overdue');
        refetch(); // Reload stats after refresh
      } catch (err) {
        console.error('Failed to refresh overdue invoices', err);
      }
    };
    refreshOverdue();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500/20 rounded-full animate-ping" />
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-center">
        <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load statistics</h2>
        <p className="text-slate-400">Please check your connection and try again.</p>
      </div>
    );
  }

  // Pre-process chart data for current vs previous month
  const chartData = (stats?.revenueTrend || []).map((day, index) => {
    const prevDay = stats?.previousMonthTrend?.[index];
    return {
      day: new Date(day.date).getDate(),
      current: day.revenue,
      previous: prevDay ? prevDay.revenue : null,
      fullDate: new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    };
  });

  const kpis = [
    {
      label: 'Total Revenue',
      value: `₹${stats.revenueToday?.toLocaleString('en-IN')}`,
      secondary: `₹${stats.revenueMonth?.toLocaleString('en-IN')} this month`,
      icon: DollarSign,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Avg Bill Value',
      value: `₹${stats.avgBillToday?.toLocaleString('en-IN')}`,
      secondary: `₹${stats.avgBillMonth?.toLocaleString('en-IN')} items avg`,
      icon: Receipt,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      label: 'Total Orders',
      value: stats.ordersToday,
      secondary: `${stats.ordersMonth} this month`,
      icon: ShoppingBag,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Unpaid Bills',
      value: stats.totalUnpaidBills,
      secondary: 'Action required',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      path: '/invoices?status=UNPAID'
    },
    {
      label: 'Overdue Bills',
      value: stats.totalOverdueBills,
      secondary: 'High priority',
      icon: AlertCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      path: '/invoices?status=OVERDUE'
    },
  ];

  const donutData = [
    { name: 'Active', value: stats.customerStatus.active, color: '#10b981' },
    { name: 'Suspended', value: stats.customerStatus.suspended, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-dm pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white tracking-tight">Business Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time performance metrics and actionable insights.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl">
          <Clock size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-400 font-mono tracking-tight uppercase">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            onClick={() => kpi.path && navigate(kpi.path)}
            className={`p-5 rounded-3xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl group transition-all duration-300 shadow-xl ${kpi.path ? 'cursor-pointer hover:border-slate-600 hover:bg-slate-800/60' : 'hover:border-slate-700'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl ${kpi.bg} border ${kpi.border} flex items-center justify-center`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              {kpi.path && (
                <ArrowRight size={14} className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className="text-2xl font-black text-white font-mono tracking-tighter tabular-nums">{kpi.value}</p>
              <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-wide">{kpi.secondary}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend Chart - Full Width */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-white text-lg tracking-tight">Revenue Trend</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Monthly daily performance</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Month</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Previous Month</span>
            </div>
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '16px', border: '1px solid #1e293b' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}
                cursor={{ stroke: '#1e293b', strokeWidth: 1 }}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
              />
              <Area
                type="monotone"
                dataKey="previous"
                stroke="#334155"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="transparent"
                animationDuration={2000}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="#22d3ee"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCurrent)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Row - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Distribution */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-white text-lg">Customers</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Status distribution</p>
            </div>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Today */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-white text-lg">Top Products</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Today's best sellers</p>
            </div>
          </div>

          <div className="space-y-4">
            {stats.topProductsToday.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-800 last:border-0 group">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-600 font-mono group-hover:text-emerald-400 transition-colors">0{idx + 1}</span>
                  <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white font-mono">{product.avgQuantity % 1 === 0 ? product.avgQuantity : product.avgQuantity.toFixed(1)}</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Avg Qty</p>
                </div>
              </div>
            ))}
            {stats.topProductsToday.length === 0 && (
              <p className="text-center text-slate-600 italic text-sm py-10">No data today.</p>
            )}
          </div>
        </div>

        {/* Out of Stock Alerts */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 relative">
              <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-white text-lg">Low Inventory</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Critical stock alerts</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {stats.outOfStockItems.map((product, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 group hover:border-rose-500/30 transition-all shadow-sm">
                <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Out of Stock</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">{product.name}</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">{product.alias || ' '}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertCircle size={14} className="text-rose-500" />
                  </div>
                </div>
              </div>
            ))}
            {stats.outOfStockItems.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                <Package size={48} className="text-slate-500 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">All stock levels normal</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}