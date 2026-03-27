import React, { useState, useEffect, useCallback } from 'react'
import { 
  FileText, Plus, Search, Filter, Loader2,
  ChevronRight, IndianRupee, Calendar, Clock,
  CheckCircle2, AlertCircle, XCircle, Eye, Download, X, Mic,
  ChevronDown, Keyboard, Printer
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { InvoicePreview, generateInvoicePDF } from '../utils/InvoiceUtils'
import Button from '../components/ui/Button'
import { backendClient } from '../api/axios'
import { toast } from 'react-hot-toast'
import VoiceBilling from './VoiceBilling'

const STATUS_CONFIG = {
  'PAID': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: CheckCircle2 },
  'PENDING': { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: Clock },
  'CANCELLED': { bg: 'bg-rose-500/10', text: 'text-rose-500', icon: XCircle },
}

const Invoices = () => {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0 })

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const fetchInvoices = useCallback(async (query = '') => {
    setIsLoading(true)
    try {
      const resp = await backendClient.get('/invoices', { params: { search: query, size: 50 } })
      const data = resp.data?.data?.content || []
      setInvoices(data)
      
      const total = data.reduce((acc, inv) => acc + inv.finalAmount, 0)
      setStats({
        total,
        paid: data.filter(i => i.status === 'PAID').length,
        pending: data.filter(i => i.status === 'PENDING').length,
      })
    } catch (err) {
      toast.error('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    const delay = setTimeout(() => fetchInvoices(e.target.value), 500)
    return () => clearTimeout(delay)
  }

  const openInvoice = (inv) => {
    setSelectedInvoice(inv)
    setIsViewModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white font-syne tracking-tight">Invoice History</h1>
          <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-black text-[10px]">Manage and track all billing activity</p>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition" size={18} />
            <input
              type="text"
              placeholder="Search ID, Customer..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-12 pr-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500/50 w-64 transition-all"
            />
          </div>

          <div className="relative">
            <Button 
              variant="primary" 
              icon={Plus} 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 rounded-2xl shadow-lg shadow-cyan-500/20"
            >
              Create New
            </Button>
            
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-3 w-72 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 p-2 animate-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={() => { navigate('/manual-billing'); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800 text-left transition rounded-2xl group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition">
                      <Keyboard size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Manual Billing</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Type items manually</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setIsVoiceModalOpen(true); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800 text-left transition rounded-2xl group border-t border-slate-800/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-rose-400 transition">
                      <Mic size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Voice Billing</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">AI Assisted Input</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Stats + Table */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Volume</p>
            <p className="text-xl font-bold text-white">₹{stats.total.toLocaleString()}</p>
          </div>
        </div>
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paid Invoices</p>
            <p className="text-xl font-bold text-white">{stats.paid}</p>
          </div>
        </div>
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Bills</p>
            <p className="text-xl font-bold text-white">{stats.pending}</p>
          </div>
        </div>
        <Button variant="outline" className="h-full rounded-3xl border-slate-800 text-slate-500 hover:text-white" icon={Filter}>More Filters</Button>
      </div>

      {/* Invoice Table Card */}
      <div className="rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                <th className="px-8 py-6 text-left">Ref Number</th>
                <th className="px-8 py-6 text-left">Customer</th>
                <th className="px-8 py-6 text-left">Issue Date</th>
                <th className="px-8 py-6 text-right">Amount</th>
                <th className="px-8 py-6 text-center">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan="6" className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-cyan-500" /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="6" className="px-8 py-20 text-center text-slate-500 font-medium">No invoices found...</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="group hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{inv.invoiceNumber}</p>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Draft ID: {String(inv.id || '').slice(0,8)}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-200">{inv.customer?.name || 'Walk-in Customer'}</p>
                    <p className="text-[10px] text-slate-500 font-mono italic">{inv.customer?.company || 'Regular Entry'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm text-slate-400">{new Date(inv.issueDate).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{new Date(inv.issueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm font-black text-white italic tracking-tighter">₹{inv.finalAmount.toFixed(2)}</p>
                    <p className="text-[9px] text-emerald-500/60 font-bold uppercase mt-1">Tax Inc.</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_CONFIG[inv.status]?.bg} ${STATUS_CONFIG[inv.status]?.text}`}>
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openInvoice(inv)}
                        className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => generateInvoicePDF(inv)}
                        className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Review Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsViewModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] bg-slate-900 border border-slate-800 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 z-20 flex items-center justify-between p-8 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-syne tracking-tight uppercase">Invoice Record</h2>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">{selectedInvoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="primary" icon={Download} onClick={() => generateInvoicePDF(selectedInvoice)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-6">
                  Download
                </Button>
                <button onClick={() => setIsViewModalOpen(false)} className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-10">
              <div className="bg-white rounded-[2rem] overflow-hidden p-1">
                <InvoicePreview invoice={selectedInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Billing Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsVoiceModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-3xl">
            <button 
              onClick={() => setIsVoiceModalOpen(false)}
              className="absolute right-6 top-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
            <VoiceBilling onSuccess={(inv) => {
              setIsVoiceModalOpen(false)
              fetchInvoices()
              openInvoice(inv)
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Invoices