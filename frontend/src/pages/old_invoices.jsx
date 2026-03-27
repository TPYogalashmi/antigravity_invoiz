import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Search, Filter, Loader2,
  ChevronRight, IndianRupee, Calendar, Clock,
  CheckCircle2, AlertCircle, XCircle, Eye, Download, X, Mic,
  ChevronDown, Keyboard
} from 'lucide-react'
import Button from '../components/ui/Button'
import { backendClient } from '../api/axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import VoiceBilling from './VoiceBilling'

const STATUS_CONFIG = {
  PAID: {
    label: 'Paid',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-5px_theme(colors.emerald.500)]'
  },
  PENDING: {
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
  const [timeBucket, setTimeBucket] = useState('ALL')
  const [minAmount, setMinAmount] = useState(null)
  const [totalInvoices, setTotalInvoices] = useState(0)

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const fetchInvoices = useCallback(async (search = '') => {
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
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount || undefined,
          size: 50
        }
      });

      const content = response.data?.data?.content || [];
      setInvoices(content);
      setTotalInvoices(response.data?.data?.totalElements || content.length);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      toast.error('Could not load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, timeBucket, minAmount]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchInvoices(searchTerm)
    }, 400)
    return () => clearTimeout(delay)
  }, [searchTerm, statusFilter, timeBucket, minAmount, fetchInvoices])

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      await backendClient.patch(`/invoices/${invoiceId}/status`, null, {
        params: { status: newStatus }
      })
      toast.success(`Invoice marked as ${newStatus.toLowerCase()}`)
      fetchInvoices(searchTerm)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const downloadPDF = (invoice) => {
    if (!invoice) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const leftCollX = 14;
    const rightCollX = 130;
    const formattedDate = new Date(invoice.issueDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE (GST)", pageWidth / 2, 20, { align: "center" });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, 25, pageWidth - 10, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Seller Details:", leftCollX, 38);
    doc.setFont("helvetica", "normal");
    doc.text("Business Name : INVOIZ MART", leftCollX, 44);
    doc.text("GSTIN         : 33ABCDE1234F1Z5", leftCollX, 49);
    doc.text("Address       : Chennai, Tamil Nadu", leftCollX, 54);
    doc.text("Phone         : +91-9876543210", leftCollX, 59);

    const sectionHeaderY = 72;
    const sectionDataY = 78;
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", leftCollX, sectionHeaderY);
    doc.text("Invoice Details:", rightCollX, sectionHeaderY);
    doc.setFont("helvetica", "normal");
    doc.text(`Customer Name : ${invoice.customer?.name || 'Walk-in Customer'}`, leftCollX, sectionDataY);
    doc.text("Customer GSTIN: N/A", leftCollX, sectionDataY + 5);
    doc.text(`Invoice No    : ${invoice.invoiceNumber}`, rightCollX, sectionDataY);
    doc.text(`Invoice Date  : ${formattedDate}`, rightCollX, sectionDataY + 5);

    const tableData = invoice.items.map((item, index) => [
      index + 1,
      item.description,
      item.quantity,
      item.unit || '1PC',
      `Rs.${Number(item.price || item.unitPrice).toFixed(2)}`,
      `${item.gstPercentage || 0}%`,
      `Rs.${Number(item.total).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['No', 'Item Name', 'Qty', 'Unit', 'Rate', 'GST', 'Amount']],
      body: tableData,
      theme: 'plain',
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.2,
      headStyles: { fillColor: null, textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, fillColor: [255, 255, 255], cellPadding: 3, lineWidth: 0, textColor: [0, 0, 0] },
      didDrawCell: (data) => {
        if (data.section === 'head') {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 30, halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("GST Breakdown", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`CGST: Rs.${(Number(invoice.totalGST) / 2).toFixed(2)}`, 14, finalY + 8);
    doc.text(`SGST: Rs.${(Number(invoice.totalGST) / 2).toFixed(2)}`, 14, finalY + 14);

    const rightColXValue = pageWidth - 65;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Total Breakdown", rightColXValue, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Subtotal", rightColXValue, finalY + 8);
    doc.text(`Rs.${Number(invoice.totalAmount).toFixed(2)}`, pageWidth - 14, finalY + 8, { align: "right" });
    doc.text("Total GST", rightColXValue, finalY + 14);
    doc.text(`Rs.${Number(invoice.totalGST).toFixed(2)}`, pageWidth - 14, finalY + 14, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Amount", rightColXValue, finalY + 25);
    doc.text(`Rs.${Number(invoice.finalAmount).toFixed(2)}`, pageWidth - 14, finalY + 25, { align: "right" });

    const centerX = pageWidth / 2;
    const footerStartY = finalY + 55;
    doc.line(centerX - 25, footerStartY, centerX + 25, footerStartY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Authorized Signature", centerX, footerStartY + 5, { align: "center" });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text("Thank You! Visit Again", centerX, footerStartY + 18, { align: "center" });

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

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
            <ChevronDown size={18} className={`ml-2 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="relative flex-1 group min-h-[54px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-500 group-focus-within:text-cyan-400" />
            </div>
            <input
              type="text"
              placeholder="Search by customer, company, or Invoice ID..."
              className="w-full h-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative w-full md:w-56 group min-h-[54px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-full px-5 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer pr-10"
            >
              <option value="">All Statuses</option>
              <option value="PAID">Paid Only</option>
              <option value="PENDING">Unpaid Only</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <ChevronRight size={16} className="text-slate-500 rotate-90" />
            </div>
          </div>

          <div className="relative w-full md:w-56 group min-h-[54px]">
            <select
              value={minAmount || ""}
              onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-full px-5 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer pr-10"
            >
              <option value="">All Values</option>
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
                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Options</th>
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
                      <td className="px-6 py-6 font-bold text-white tracking-tight">{inv.customer?.name || 'Walk-in'}</td>
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
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => { setSelectedInvoice(inv); setIsViewModalOpen(true); }}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 transition border border-slate-700/50"
                            title="View Detail"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => downloadPDF(inv)}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition border border-slate-700/50"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'PAID')}
                              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/20 transition border border-slate-700/50"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                          {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'CANCELLED')}
                              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-rose-500/20 transition border border-slate-700/50"
                              title="Cancel Invoice"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
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
                  onClick={() => downloadPDF(selectedInvoice)}
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
              <div className="bg-white text-slate-900 rounded-2xl p-10 shadow-inner overflow-hidden">
                <div className="border-b-2 border-slate-100 pb-8 mb-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Seller Details</h3>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">INVOIZ MART</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">GSTIN: <span className="text-slate-900">33ABCDE1234F1Z5</span></p>
                  <p className="text-sm text-slate-500">Chennai, Tamil Nadu • +91-9876543210</p>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-10">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Bill To</h3>
                    <p className="text-xl font-bold text-slate-900">{selectedInvoice.customer?.name || 'Walk-in Customer'}</p>
                    {selectedInvoice.customer?.company && <p className="text-sm text-slate-600 mt-1">{selectedInvoice.customer.company}</p>}
                    <p className="text-sm text-slate-500 mt-2">GSTIN: <span className="font-medium">N/A</span></p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Invoice Information</h3>
                    <p className="text-sm font-medium text-slate-600">No: <span className="text-slate-900 font-bold font-mono">#{selectedInvoice.invoiceNumber}</span></p>
                    <p className="text-sm font-medium text-slate-600 mt-1">Issued: <span className="text-slate-900 font-bold">{formatDate(selectedInvoice.issueDate)}</span></p>
                    {selectedInvoice.dueDate && (
                      <p className="text-sm font-medium text-slate-600 mt-1 text-rose-500">Due: <span className="font-bold">{formatDate(selectedInvoice.dueDate)}</span></p>
                    )}
                  </div>
                </div>

                <div className="mb-10 overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <th className="px-6 py-4 text-left">No</th>
                        <th className="px-6 py-4 text-left">Item Name</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-right">Rate</th>
                        <th className="px-6 py-4 text-right">GST</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedInvoice.items?.map((item, i) => (
                        <tr key={i} className="text-slate-700">
                          <td className="px-6 py-4 text-left font-mono text-[11px] text-slate-400">{i + 1}</td>
                          <td className="px-6 py-4 text-left font-bold text-slate-900">{item.description}</td>
                          <td className="px-6 py-4 text-center font-medium">{item.quantity}</td>
                          <td className="px-6 py-4 text-right font-medium">₹{Number(item.price || item.unitPrice).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-xs text-slate-500">{item.gstPercentage || 0}%</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">₹{Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start pt-6">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">GST Breakdown</h3>
                    <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 font-medium">CGST</span>
                        <span className="font-bold text-slate-900">₹{(Number(selectedInvoice.totalGST) / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 font-medium">SGST</span>
                        <span className="font-bold text-slate-900">₹{(Number(selectedInvoice.totalGST) / 2).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Final Settlement</h3>
                    <div className="space-y-2 px-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Subtotal</span>
                        <span className="font-bold text-slate-900">₹{Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Tax Amount</span>
                        <span className="font-bold text-slate-900">₹{Number(selectedInvoice.totalGST).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 text-white px-6 py-5 mt-4 rounded-2xl shadow-xl shadow-slate-900/10">
                        <span className="text-xs font-black uppercase tracking-widest opacity-70">Total Amount</span>
                        <span className="text-2xl font-black">₹{Number(selectedInvoice.finalAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-20 flex flex-col items-center">
                  <div className="w-64 h-px bg-slate-200 mb-4"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Authorized Signatory</p>
                  <p className="text-xs italic text-slate-300 mt-6 tracking-wide underline underline-offset-8">Thank you for your business!</p>
                </div>
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
                  // We keep the modal open so user can see/download the invoice in the VoiceBilling screen
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}