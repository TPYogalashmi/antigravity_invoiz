import React, { useState, useEffect, useCallback } from 'react'
import { 
  ArrowLeft, Plus, Trash2, Search, IndianRupee, 
  Building2, User, Box, Save, Download, CheckCircle2, 
  Loader2, Calculator, Info, FileText,
  ChevronLeft, ChevronRight, ShoppingCart
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { backendClient } from '../api/axios'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import { InvoicePreview, generateInvoicePDF } from '../utils/InvoiceUtils'

const ManualBilling = () => {
  const navigate = useNavigate()

  // --- Form State ---
  const [billingType, setBillingType] = useState('B2C') // B2B or B2C
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerPage, setCustomerPage] = useState(0)
  const [customerTotalPages, setCustomerTotalPages] = useState(0)

  const [items, setItems] = useState([]) // { id, productId, name, price, quantity, gst, total }
  const [productSearch, setProductSearch] = useState('')
  const [productSuggestions, setProductSuggestions] = useState([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdInvoice, setCreatedInvoice] = useState(null)

  // --- Fetch Suggestions ---
  const fetchCustomerSuggestions = useCallback(async (query, page = 0) => {
    if (!query || query.length < 1) {
      setCustomerSuggestions([])
      setCustomerTotalPages(0)
      return
    }
    try {
      const hasTaxIdFilter = billingType === 'B2B' ? true : false;
      const resp = await backendClient.get('/customers', {
        params: {
          search: query,
          page,
          size: 5,
          hasTaxId: hasTaxIdFilter
        }
      })
      const data = resp.data?.data
      setCustomerSuggestions(data?.content || [])
      setCustomerTotalPages(data?.totalPages || 0)
      setCustomerPage(page)
      setShowCustomerDropdown(true)
    } catch (err) {
      console.error('Customer fetch failed', err)
    }
  }, [billingType])

  const fetchProductSuggestions = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setProductSuggestions([])
      return
    }
    try {
      const resp = await backendClient.get('/products', { params: { search: query, status: 'AVAILABLE', size: 8, onlyName: true } })
      setProductSuggestions(resp.data?.data?.content || [])
      setShowProductDropdown(true)
    } catch (err) {
      console.error('Product fetch failed', err)
    }
  }, [])

  useEffect(() => {
    const delay = setTimeout(() => {
      if (customerSearch && !selectedCustomer) fetchCustomerSuggestions(customerSearch)
    }, 300)
    return () => clearTimeout(delay)
  }, [customerSearch, fetchCustomerSuggestions, selectedCustomer])

  useEffect(() => {
    const delay = setTimeout(() => fetchProductSuggestions(productSearch), 300)
    return () => clearTimeout(delay)
  }, [productSearch, fetchProductSuggestions])

  // --- Actions ---
  const addItem = (product) => {
    const existing = items.find(it => it.productId === product.id)
    if (existing) {
      setItems(items.map(it => it.productId === product.id ? {
        ...it,
        quantity: it.quantity + 1,
        total: (it.quantity + 1) * it.price * (1 + it.gst / 100)
      } : it))
    } else {
      setItems([...items, {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        unit: product.unit || 'PCS',
        gst: product.gstPercentage || 0,
        total: product.price * (1 + (product.gstPercentage || 0) / 100)
      }])
    }
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const updateItemQty = (id, q) => {
    const item = items.find(it => it.id === id)
    if (!item) return

    const isDecimalUnit = ['kg', 'g', 'ltr', 'ml', 'mg'].includes(item.unit?.toLowerCase())
    let qty = parseFloat(q) || 0

    if (isDecimalUnit) {
      qty = Math.max(0.1, qty)
    } else {
      qty = Math.max(1, Math.round(qty))
    }

    setItems(items.map(it => it.id === id ? {
      ...it,
      quantity: qty,
      total: qty * it.price * (1 + it.gst / 100)
    } : it))
  }

  const removeItem = (id) => setItems(items.filter(it => it.id !== id))

  const subtotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0)
  const totalTax = items.reduce((acc, it) => acc + (it.price * it.quantity * it.gst / 100), 0)
  const finalTotal = subtotal + totalTax

  const handleCreateInvoice = async () => {
    if (!selectedCustomer && !customerSearch) {
      toast.error('Please specify a customer')
      return
    }
    if (items.length === 0) {
      toast.error('Add at least one item')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        customerId: selectedCustomer?.id,
        customerName: !selectedCustomer ? customerSearch : undefined,
        items: items.map(it => ({
          productId: it.productId,
          productName: it.name,
          description: it.name,
          quantity: it.quantity,
          price: it.price,
          gstPercentage: it.gst
        }))
      }
      const resp = await backendClient.post('/invoices', payload)
      setCreatedInvoice(resp.data?.data)
      toast.success('Invoice generated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdInvoice) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header / Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl overflow-visible">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-syne tracking-tight">Generated Invoice</h1>
              <p className="text-sm font-mono text-cyan-400 font-bold uppercase tracking-widest mt-0.5 opacity-80">Ref: {createdInvoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              icon={Download}
              onClick={() => generateInvoicePDF(createdInvoice)}
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-2xl"
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              icon={Plus}
              onClick={() => { setCreatedInvoice(null); setSelectedCustomer(null); setItems([]); }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 rounded-2xl"
            >
              New Order
            </Button>
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={() => navigate('/invoices')}
              className="text-slate-500 hover:text-white rounded-2xl"
            >
              Invoice List
            </Button>
          </div>
        </div>

        {/* Reusable Invoice Preview */}
        <InvoicePreview invoice={createdInvoice} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-in fade-in duration-300">
      {/* Navigation Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/invoices')} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white font-syne tracking-tight">Manual Billing</h1>
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black">Standard Professional Invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Selection Card */}
          <div className="p-8 rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md relative overflow-visible shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-inner">
                  <User size={18} />
                </div>
                <h2 className="text-xl font-bold text-white font-syne">Customer Details</h2>
              </div>

              {/* B2B / B2C Toggle */}
              <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 shadow-lg">
                <button
                  onClick={() => { setBillingType('B2C'); setSelectedCustomer(null); setCustomerSearch(''); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${billingType === 'B2C' ? 'bg-cyan-500 text-slate-950 shadow-xl scale-105' : 'text-slate-500 hover:text-white'}`}
                >B2C Entry</button>
                <button
                  onClick={() => { setBillingType('B2B'); setSelectedCustomer(null); setCustomerSearch(''); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${billingType === 'B2B' ? 'bg-amber-500 text-slate-950 shadow-xl scale-105' : 'text-slate-500 hover:text-white'}`}
                >B2B Corporate</button>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                {billingType === 'B2B' ? <Building2 size={18} /> : <User size={18} />}
              </div>
              <input
                type="text"
                placeholder={billingType === 'B2B' ? "Search Company or Tax ID..." : "Search Customer Name or Phone..."}
                value={selectedCustomer ? (selectedCustomer.name || selectedCustomer.company) : customerSearch}
                readOnly={!!selectedCustomer}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-14 pr-12 py-4 rounded-3xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500/50 ring-4 ring-cyan-500/0 focus:ring-cyan-500/5 transition-all font-medium"
              />

              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-slate-800 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {showCustomerDropdown && !selectedCustomer && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)} />
                  <div className="absolute z-50 top-full mt-3 w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in duration-300">
                    {customerSuggestions.length > 0 ? (
                      customerSuggestions.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); }}
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800 transition border-b border-slate-800/50 last:border-0 group/item"
                        >
                          <div className="text-left">
                            <p className="text-sm font-bold text-white group-hover/item:text-cyan-400 transition-colors">{c.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono tracking-wider">{c.company || 'Individual'}</p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${c.taxId ? 'border-cyan-500/30 text-cyan-500 bg-cyan-500/5' : 'border-slate-700 text-slate-500'}`}>
                              {c.taxId ? 'GST REGISTERED' : 'REGULAR'}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-8 py-6 text-xs text-slate-500 italic text-center bg-slate-900">
                        No matches found for "{customerSearch}"
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Product Section Card */}
          <div className="p-8 rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="relative group">
                  <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition" />
                  <input
                    type="text"
                    placeholder="Find inventory..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 rounded-3xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500/50 ring-4 ring-cyan-500/0 focus:ring-cyan-500/10 transition-all font-medium outline-none"
                  />
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {productSuggestions.length > 0 ? (
                    productSuggestions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800 border border-slate-800/50 hover:border-cyan-500/30 rounded-3xl transition-all group/prod text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white group-hover/prod:text-cyan-400 transition-colors truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">{p.alias || 'Standard Unit'}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-black text-white italic tracking-tighter">₹{p.price.toFixed(2)}</p>
                          <p className="text-[9px] text-cyan-500 font-bold mt-0.5">+{p.gstPercentage}% Tax</p>
                        </div>
                        <div className="ml-5 w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center text-slate-600 group-hover/prod:bg-cyan-500 group-hover/prod:text-slate-950 transition-all shrink-0">
                          <Plus size={16} />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-20 text-center opacity-20">
                      <Box size={48} className="mx-auto text-slate-700" />
                      <p className="text-[10px] font-black uppercase mt-4 tracking-widest">No stock matches</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner">
                    <ShoppingCart size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-white font-syne tracking-tight">Added Products</h2>
                </div>

                <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar max-h-[550px]">
                  {items.length > 0 ? (
                    items.map(it => (
                      <div key={it.id} className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 group/row hover:border-emerald-500/20 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{it.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">₹{it.price.toFixed(2)}</span>
                            <div className="w-1 h-1 rounded-full bg-slate-800" />
                            <span className="text-[11px] font-black text-emerald-400">Rs.{it.total.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              value={it.quantity}
                              step={['kg', 'g', 'ltr', 'ml', 'mg'].includes(it.unit?.toLowerCase()) ? "0.1" : "1"}
                              min={['kg', 'g', 'ltr', 'ml', 'mg'].includes(it.unit?.toLowerCase()) ? "0.1" : "1"}
                              onChange={(e) => updateItemQty(it.id, e.target.value)}
                              className="w-16 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-center text-xs text-white font-black"
                            />
                            <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">{it.unit || 'PCS'}</span>
                          </div>
                          <button onClick={() => removeItem(it.id)} className="p-2.5 text-rose-500/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-32 text-center opacity-20">
                      <ShoppingCart size={48} className="mx-auto text-slate-700" />
                      <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Cart is empty</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Sidebar */}
        <div className="space-y-8">
          <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl sticky top-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-inner">
                <FileText size={20} />
              </div>
              <h2 className="text-xl font-bold text-white font-syne">Bill Summary</h2>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-slate-500">
                <span className="font-bold uppercase tracking-widest text-[10px]">Items</span>
                <span className="text-white font-black">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span className="font-bold uppercase tracking-widest text-[10px]">Base Value</span>
                <span className="text-slate-300 font-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span className="font-bold uppercase tracking-widest text-[10px]">Tax Charged</span>
                <span className="text-emerald-500/80 font-bold">₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-slate-800 my-4" />
              <div className="flex justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                <span className="text-[13px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Payable</span>
                <span className="text-xl font-black text-white tracking-tighter italic">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 ${isSubmitting || items.length === 0 || (!selectedCustomer && !customerSearch) ? 'bg-slate-800 text-slate-600' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_10px_40px_rgba(6,182,212,0.3)]'}`}
              icon={isSubmitting ? Loader2 : Save}
              disabled={isSubmitting || items.length === 0 || (!selectedCustomer && !customerSearch)}
              onClick={handleCreateInvoice}
            >
              {isSubmitting ? 'PROCESSING' : 'PLACE ORDER'}
            </Button>
          </div>

          <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Info size={16} />
            </div>
            <p className="text-[10px] text-amber-500/70 font-bold leading-relaxed uppercase tracking-tighter">
              B2B transactions require valid Tax IDs for GST credit eligibility. Individual consumer bills are marked N/A.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManualBilling
