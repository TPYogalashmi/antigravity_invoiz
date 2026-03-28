import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Search, Filter, Loader2,
  ChevronRight, IndianRupee, Calendar, Clock,
  CheckCircle2, AlertCircle, XCircle, Eye, Download, X, Mic,
  ChevronDown, Keyboard, Users, Edit3, Save, RotateCcw
} from 'lucide-react'
import Button from '../components/ui/Button'
import { backendClient } from '../api/axios'
import toast from 'react-hot-toast'
import { InvoicePreview, generateInvoicePDF } from '../utils/InvoiceUtils'
import VoiceBilling from './VoiceBilling'

const STATUS_CONFIG = {
  PAID: {
    label: 'Paid',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-5px_theme(colors.emerald.500)]'
  },
  UNPAID: {
    label: 'Unpaid',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_-5px_theme(colors.amber.500)]'
  },
  OVERDUE: {
    label: 'Overdue',
    icon: AlertCircle,
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_-5px_theme(colors.rose.500)]'
  },
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-slate-700/30 text-slate-500 border-slate-700/50'
  }
}

export default function Invoices() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [timeBucket, setTimeBucket] = useState('ALL')
  const [minAmount, setMinAmount] = useState(null)
  const [totalInvoices, setTotalInvoices] = useState(0)

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [statusInvoice, setStatusInvoice] = useState(null)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const fetchInvoices = useCallback(async (search = '', page = 0) => {
    setIsLoading(true);

    const formatLocal = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let startDate = null;
    let endDate = null;
    const today = new Date();
    switch (timeBucket) {
      case 'TODAY':
        startDate = endDate = formatLocal(today);
        break;
      case 'YESTERDAY':
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        startDate = endDate = formatLocal(y);
        break;
      case 'LAST_7_DAYS':
        const l7 = new Date(today);
        l7.setDate(today.getDate() - 6);
        startDate = formatLocal(l7);
        endDate = formatLocal(today);
        break;
      case 'LAST_30_DAYS':
        const l30 = new Date(today);
        l30.setDate(today.getDate() - 29);
        startDate = formatLocal(l30);
        endDate = formatLocal(today);
        break;
      case 'LAST_3_MONTHS':
        const l3m = new Date(today);
        l3m.setMonth(today.getMonth() - 3);
        startDate = formatLocal(l3m);
        endDate = formatLocal(today);
        break;
    }

    try {
      const response = await backendClient.get('/invoices', {
        params: {
          search: search?.trim() || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount || undefined,
          page,
          size: 5
        }
      });

      const data = response.data?.data;
      setInvoices(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      toast.error('Could not load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, timeBucket, minAmount]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchInvoices(searchTerm, currentPage)
    }, 400)
    return () => clearTimeout(delay)
  }, [searchTerm, statusFilter, typeFilter, timeBucket, minAmount, currentPage, fetchInvoices])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, statusFilter, typeFilter, timeBucket, minAmount])

  const handleUpdateStatus = async (invoiceId, status) => {
    if (!status) return;
    try {
      await backendClient.patch(`/invoices/${invoiceId}/status`, null, {
        params: { status }
      })
      toast.success(`Invoice marked as ${status.toLowerCase()}`)
      setIsStatusModalOpen(false)
      fetchInvoices(searchTerm)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case 'UNPAID':
        return [
          { value: 'PAID', label: 'Mark as Paid', icon: CheckCircle2, color: 'text-emerald-400' },
          { value: 'OVERDUE', label: 'Mark as Overdue', icon: AlertCircle, color: 'text-rose-400' },
          { value: 'CANCELLED', label: 'Cancel Invoice', icon: XCircle, color: 'text-slate-500' }
        ];
      case 'OVERDUE':
        return [
          { value: 'PAID', label: 'Mark as Paid', icon: CheckCircle2, color: 'text-emerald-400' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-8 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Track your billing history and payment statuses
          </p>
        </div>
        <div className="relative">
          <Button
            icon={Plus}
            size="lg"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-2xl transition shadow-xl shadow-cyan-500/20 group"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            Create Invoice
          </Button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-4 w-64 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                <button
                  onClick={() => { navigate('/manual-billing'); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800 text-left transition rounded-2xl group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition">
                    <Keyboard size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">Manual Entry</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Form Based</p>
                  </div>
                </button>

                <button
                  onClick={() => { navigate('/voice-billing'); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800 text-left transition rounded-2xl group border-t border-slate-800/50"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-rose-400 transition">
                    <Mic size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">Voice Billing</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">AI & Mic</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
          <div className="relative md:col-span-1 group min-h-[54px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-500 group-focus-within:text-cyan-400" />
            </div>
            <input
              type="text"
              placeholder="Search by Ph.no or name"
              className="w-full h-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative group min-h-[54px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-full px-5 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer pr-10"
            >
              <option value="">Payment Status</option>
              <option value="PAID">Paid Only</option>
              <option value="UNPAID">Unpaid Only</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <ChevronRight size={16} className="text-slate-500 rotate-90" />
            </div>
          </div>

          <div className="relative group min-h-[54px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-full px-5 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer pr-10"
            >
              <option value="">Customer Type</option>
              <option value="B2B">B2B (Corporate)</option>
              <option value="B2C">B2C (Individual)</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <ChevronRight size={16} className="text-slate-500 rotate-90" />
            </div>
          </div>

          <div className="relative group min-h-[54px]">
            <select
              value={minAmount || ""}
              onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-full px-5 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer pr-10"
            >
              <option value="">Bill Amount</option>
              <option value="1000">&gt; ₹1,000</option>
              <option value="5000">&gt; ₹5,000</option>
              <option value="10000">&gt; ₹10,000</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <ChevronRight size={16} className="text-slate-500 rotate-90" />
            </div>
          </div>
        </div>


        <div className="flex flex-wrap gap-2 pt-2 items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Timeline:</span>
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
            { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
            { id: 'LAST_3_MONTHS', label: 'Last 3 Months' },
          ].map((bucket) => (
            <button
              key={bucket.id}
              onClick={() => setTimeBucket(bucket.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${timeBucket === bucket.id
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
                }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-[2.5rem] bg-slate-900/30 border border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-900/10">
                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identify</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timelines</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <Loader2 size={32} className="text-cyan-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center text-slate-500 italic">No invoices found</td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusInfo = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT
                  const StatusIcon = statusInfo.icon
                  return (
                    <tr key={inv.id} className="group hover:bg-slate-800/20 transition-all duration-300">
                      <td className="px-8 py-6 font-mono text-xs text-cyan-400">#{inv.invoiceNumber}</td>
                      <td className="px-6 py-6 tracking-tight">
                        <p className="font-bold text-white">{inv.customer?.name || 'Walk-in'}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{inv.customer?.taxId ? 'B2B' : 'B2C'}</p>
                      </td>
                      <td className="px-6 py-6 font-bold text-white text-lg tracking-tighter">
                        <IndianRupee size={14} className="inline mr-1 text-cyan-500" />
                        {Number(inv.finalAmount).toFixed(2)}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.className}`}>
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-slate-300">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(inv.issueDate)}</span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock size={12} />{formatDate(inv.dueDate)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity duration-300">
                          <button
                            onClick={() => { setSelectedInvoice(inv); setIsViewModalOpen(true); }}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 transition border border-slate-700/50"
                            title="View Detail"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => generateInvoicePDF(inv)}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition border border-slate-700/50"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => { setStatusInvoice(inv); setNewStatus(''); setIsStatusModalOpen(true); }}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 transition border border-slate-700/50"
                            title="Update Status"
                          >
                            <Edit3 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-6 border-t border-slate-800/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-300">{(currentPage * 5) + 1}</span> to <span className="text-slate-300">{Math.min((currentPage + 1) * 5, totalElements)}</span> of <span className="text-slate-300">{totalElements}</span> bills
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold"
            >
              Prev
            </button>
            <div className="flex gap-1 items-center px-1">
              {(() => {
                const maxVisible = 3;
                let startPage = Math.max(0, Math.min(currentPage, totalPages - maxVisible));
                const endPage = Math.min(totalPages, startPage + maxVisible);

                return [...Array(endPage - startPage)].map((_, i) => {
                  const pageNum = startPage + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                        ? 'bg-cyan-500 text-slate-950 shadow-lg'
                        : 'text-slate-500 hover:text-white'
                        }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                });
              })()}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* --- INVOICE VIEW MODAL --- */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>

          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-20 flex items-center justify-between p-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-cyan-400" />
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Invoice Details</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generateInvoicePDF(selectedInvoice)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm font-bold flex items-center gap-2"
                >
                  <Download size={16} /> PDF
                </button>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-white rounded-2xl p-1 shadow-inner overflow-hidden">
                <InvoicePreview invoice={selectedInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- STATUS UPDATE MODAL --- */}
      {isStatusModalOpen && statusInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsStatusModalOpen(false)}></div>

          <div className="relative w-full max-w-md rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Update Status</h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">Invoice #{statusInvoice.invoiceNumber}</p>
                </div>
                <button onClick={() => setIsStatusModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Current Status</label>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${STATUS_CONFIG[statusInvoice.status]?.className}`}>
                    {(() => {
                      const Icon = STATUS_CONFIG[statusInvoice.status]?.icon || HelpCircle;
                      return <Icon size={14} />;
                    })()}
                    <span className="text-xs font-bold uppercase tracking-wider">{STATUS_CONFIG[statusInvoice.status]?.label}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Choose New Status</label>
                  <div className="grid grid-cols-1 gap-3">
                    {getStatusOptions(statusInvoice.status).length > 0 ? (
                      getStatusOptions(statusInvoice.status).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setNewStatus(opt.value)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${newStatus === opt.value
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                            : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            }`}
                        >
                          <div className={`p-2 rounded-xl bg-slate-900 ${opt.color}`}>
                            <opt.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{opt.label}</p>
                            <p className="text-[10px] opacity-60 font-medium uppercase tracking-tighter">Click to select</p>
                          </div>
                          {newStatus === opt.value && (
                            <div className="ml-auto w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-10 text-center bg-slate-800/20 rounded-[2rem] border border-dashed border-slate-800">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
                          <RotateCcw size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">Nothing to update</p>
                        <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest leading-relaxed">This status is final</p>
                      </div>
                    )}
                  </div>
                </div>

                {getStatusOptions(statusInvoice.status).length > 0 && (
                  <div className="pt-4">
                    <button
                      disabled={!newStatus}
                      onClick={() => handleUpdateStatus(statusInvoice.id, newStatus)}
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-xl ${newStatus
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                    >
                      <Save size={18} />
                      Apply Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VOICE BILLING MODAL --- */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsVoiceModalOpen(false)}></div>

          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] bg-slate-950 border border-slate-800 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="sticky top-0 z-20 flex items-center justify-between p-6 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                  <Mic size={20} className="text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight font-syne">Voice Billing</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AI Powered Generation</p>
                </div>
              </div>
              <button onClick={() => setIsVoiceModalOpen(false)} className="p-3 rounded-2xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <VoiceBilling
                onSuccess={(newInv) => {
                  toast.success('Invoice generated via voice!')
                  fetchInvoices(searchTerm)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}