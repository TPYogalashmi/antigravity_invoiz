import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, Plus, Trash2, Search, IndianRupee,
  Building2, User, Box, Save, Download, CheckCircle2,
  Loader2, Calculator, Info, FileText,
  ChevronLeft, ChevronRight, ShoppingCart, XCircle, MoreVertical, Calendar
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { backendClient } from '../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useAuthStore'
import { InvoicePreview, generateInvoicePDF } from '../utils/InvoiceUtils'
import Button from '../components/ui/Button'

const ManualBilling = () => {
  const { user: seller } = useAuthStore()
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
  const [productPage, setProductPage] = useState(0)
  const [productTotalPages, setProductTotalPages] = useState(0)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdInvoice, setCreatedInvoice] = useState(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // --- Fetch Suggestions ---
  const [overrideDiscount, setOverrideDiscount] = useState(0)

  const fetchCustomerDetails = useCallback(async (customerId) => {
    try {
      const resp = await backendClient.get(`/customers/${customerId}/profile`)
      setSelectedCustomer(prev => ({ ...prev, ...resp.data?.data }))
    } catch (err) {
      console.error('Failed to fetch customer profile', err)
    }
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      // Logic: Pick specifically agreed overall discount if set (even if it's 0)
      // Check both top level and nested customer from profile response
      const customerData = selectedCustomer.customer || selectedCustomer;
      const manualDiscount = customerData.agreedDiscount !== null && customerData.agreedDiscount !== undefined
        ? customerData.agreedDiscount 
        : (billingType === 'B2B' ? 10 : 0)
      
      setOverrideDiscount(manualDiscount)
    }
  }, [selectedCustomer, billingType])

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

  const fetchProductSuggestions = useCallback(async (query, page = 0) => {
    if (!query || query.length < 1) {
      setProductSuggestions([])
      setProductTotalPages(0)
      return
    }
    try {
      const resp = await backendClient.get('/products', {
        params: {
          search: query,
          size: 5,
          page,
          onlyName: true
        }
      })
      const data = resp.data?.data
      setProductSuggestions(data?.content || [])
      setProductTotalPages(data?.totalPages || 0)
      setProductPage(page)
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

  // Calculate dynamic discount
  let discountAmount = 0
  if (selectedCustomer) {
    // 1. Specific Product Discounts (mostly for B2C)
    let productDiscountTotal = 0
    if (billingType === 'B2C') {
      items.forEach(it => {
        const config = selectedCustomer.configuredDiscounts?.find(d => d.productId === it.productId)
        if (config) {
          productDiscountTotal += (it.price * it.quantity * config.agreedDiscount) / 100
        }
      })
    }
    
    // 2. Overall Customer Discount (Apply to remaining subtotal or specifically defined)
    // For consistency, we'll apply it to the whole subtotal if no product-specific discount was hit on a line, 
    // or simply apply it to the whole subtotal if it's more than 0. 
    // Usually, users expect either/or but we'll prioritize Overall if > 0.
    if (overrideDiscount > 0 && productDiscountTotal === 0) {
      discountAmount = (subtotal * overrideDiscount) / 100
    } else {
      discountAmount = productDiscountTotal
    }
  }

  const finalTotal = subtotal + totalTax - discountAmount

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
        })),
        dueDate: billingType === 'B2B' 
          ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
          : null
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

  const handleWalkInSelect = async () => {
    try {
      const resp = await backendClient.get('/customers', {
        params: { search: '1111111111', size: 1 }
      })
      const found = resp.data?.data?.content?.find(c => c.phone === '1111111111')

      if (found) {
        setSelectedCustomer(found)
        fetchCustomerDetails(found.id)
        toast.success('Walk-in selected')
      } else {
        if (window.confirm('Walk-in Customer record not found. Create it now?')) {
          const createResp = await backendClient.post('/customers', {
            name: 'Walk-in Customer',
            phone: '1111111111',
            status: 'ACTIVE'
          })
          const newCust = createResp.data?.data
          if (newCust) {
            setSelectedCustomer(newCust)
            fetchCustomerDetails(newCust.id)
            toast.success('Walk-in created & selected')
          }
        }
      }
    } catch (err) {
      toast.error('Failed to select walk-in customer')
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!createdInvoice) return
    setIsUpdatingStatus(true)
    try {
      await backendClient.patch(`/invoices/${createdInvoice.id}/status`, null, {
        params: { status }
      })
      setCreatedInvoice({ ...createdInvoice, status })
      toast.success(`Invoice marked as ${status.toLowerCase()}`)
    } catch (err) {
      toast.error('Status update failed')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleUpdateDueDate = async (date) => {
    if (!createdInvoice || !date) return
    setIsUpdatingStatus(true)
    try {
      await backendClient.patch(`/invoices/${createdInvoice.id}/due-date`, null, {
        params: { dueDate: date }
      })
      setCreatedInvoice({ ...createdInvoice, dueDate: date })
      toast.success(`Due date updated to ${new Date(date).toLocaleDateString()}`)
    } catch (err) {
      toast.error('Failed to update due date')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleUpdateDiscount = async (productId, val) => {
    if (!selectedCustomer) return
    try {
      if (productId) {
        await backendClient.patch(`/customers/${selectedCustomer.id}/specific-discounts/${productId}`, null, {
          params: { discount: parseFloat(val) || 0 }
        })
      } else {
        await backendClient.patch(`/customers/${selectedCustomer.id}/overall-discount`, null, {
          params: { discount: parseFloat(val) || 0 }
        })
      }
      // Refresh details
      fetchCustomerDetails(selectedCustomer.id)
      toast.success('Reward percentage updated')
    } catch (err) {
      toast.error('Failed to update discount')
    }
  }

  if (createdInvoice) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-xl relative overflow-visible">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white font-syne">Invoice Generated</h1>
                <p className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest mt-0.5 opacity-80">Ref: {createdInvoice.invoiceNumber}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateInvoicePDF({ ...createdInvoice, seller })}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <Download size={14} /> PDF
              </button>

              {createdInvoice.status !== 'PAID' && createdInvoice.status !== 'CANCELLED' && (
                <>
                  <button
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus('PAID')}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-cyan-500/10 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Mark Paid
                  </button>

                  <div className="relative inline-block">
                    <input
                      type="date"
                      id="invoice-due-date-picker-manual"
                      className="sr-only"
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleUpdateDueDate(e.target.value)}
                    />
                    <button
                      onClick={() => document.getElementById('invoice-due-date-picker-manual').showPicker()}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                    >
                      <Calendar size={14} /> Due Date
                    </button>
                  </div>

                  <button
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus('CANCELLED')}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-rose-500/20"
                  >
                    Cancel
                  </button>
                </>
              )}

              <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block" />

              <button
                onClick={() => { setCreatedInvoice(null); setSelectedCustomer(null); setItems([]); setCustomerSearch(''); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg"
              >
                <Plus size={14} /> New
              </button>

              <button
                onClick={() => navigate('/invoices')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg"
              >
                <ArrowLeft size={14} /> Invoices
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl overflow-hidden">
          <InvoicePreview invoice={{ ...createdInvoice, seller }} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-in fade-in duration-300">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-syne tracking-tight">Manual Billing</h1>
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black">Standard Professional Invoice</p>
        </div>
        <button 
          onClick={() => navigate('/invoices')} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
        >
          <ArrowLeft size={14} /> Back to Invoices
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Selection Card */}
          <div className="p-8 rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md relative z-30 overflow-visible shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-inner">
                  <User size={18} />
                </div>
                <h2 className="text-xl font-bold text-white font-syne">Customer Details</h2>
              </div>

              {/* B2B / B2C Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleWalkInSelect}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-95"
                >
                  Walk-in
                </button>
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
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                {billingType === 'B2B' ? <Building2 size={18} /> : <User size={18} />}
              </div>
              <input
                type="text"
                placeholder={billingType === 'B2B' ? "Search Company or Phone Number..." : "Search Customer Name or Phone Number..."}
                value={selectedCustomer ? (selectedCustomer.name || selectedCustomer.company) : customerSearch}
                readOnly={!!selectedCustomer}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && selectedCustomer) {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }
                }}
                className="w-full pl-14 pr-6 py-4 rounded-3xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500/50 ring-4 ring-cyan-500/0 focus:ring-cyan-500/5 transition-all font-medium"
              />

              {showCustomerDropdown && !selectedCustomer && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)} />
                  <div className="absolute z-50 top-full mt-3 w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in duration-300">
                    {customerSuggestions.length > 0 ? (
                      customerSuggestions.map(c => (
                        <button
                          key={c.id}
                          disabled={c.status === 'SUSPENDED'}
                          onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); fetchCustomerDetails(c.id); }}
                          className={`w-full flex items-center justify-between px-6 py-4 transition border-b border-slate-800/50 last:border-0 group/item ${c.status === 'SUSPENDED'
                            ? 'bg-slate-900/40 opacity-50 cursor-not-allowed'
                            : 'hover:bg-slate-800'
                            }`}
                        >
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-bold transition-colors ${c.status === 'SUSPENDED' ? 'text-slate-500' : 'text-white group-hover/item:text-cyan-400'}`}>
                                {c.name}
                              </p>
                              {c.status === 'SUSPENDED' && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[8px] font-black text-rose-500 uppercase tracking-widest">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono tracking-wider">{c.company || 'Individual'}</p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${c.status === 'SUSPENDED'
                              ? 'border-slate-800 text-slate-600'
                              : c.taxId ? 'border-cyan-500/30 text-cyan-500 bg-cyan-500/5' : 'border-slate-700 text-slate-500'
                              }`}>
                              {c.taxId ? 'GST REGISTERED' : 'REGULAR'}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                          <div className="px-8 py-10 text-center bg-slate-900 flex flex-col items-center gap-4">
                            <p className="text-xs text-slate-500 italic">No matches found for "{customerSearch}"</p>
                            <button
                              onClick={() => navigate('/customers?create=true')}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 flex items-center gap-2"
                            >
                              <Plus size={14} /> Create Customer
                            </button>
                          </div>
                    )}

                    {customerTotalPages > 1 && (
                      <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between">
                        <button
                          disabled={customerPage === 0}
                          onClick={(e) => { e.stopPropagation(); fetchCustomerSuggestions(customerSearch, customerPage - 1); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 text-slate-400 transition"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Page {customerPage + 1} of {customerTotalPages}
                        </span>
                        <button
                          disabled={customerPage >= customerTotalPages - 1}
                          onClick={(e) => { e.stopPropagation(); fetchCustomerSuggestions(customerSearch, customerPage + 1); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 text-slate-400 transition"
                        >
                          <ChevronRight size={16} />
                        </button>
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
                    productSuggestions.map(p => {
                      const isOutOfStock = p.status === 'OUT_OF_STOCK';
                      return (
                        <button
                          key={p.id}
                          disabled={isOutOfStock}
                          onClick={() => addItem(p)}
                          className={`w-full flex items-center justify-between p-4 border transition-all group/prod text-left rounded-3xl ${
                            isOutOfStock 
                              ? 'bg-rose-500/5 border-rose-500/20 cursor-not-allowed opacity-60' 
                              : 'bg-slate-800/30 hover:bg-slate-800 border-slate-800/50 hover:border-cyan-500/30'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-bold truncate transition-colors ${isOutOfStock ? 'text-rose-400' : 'text-white group-hover/prod:text-cyan-400'}`}>
                                {p.name}
                              </p>
                              {isOutOfStock && (
                                <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">OOS</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">{p.unit || p.alias || 'Pcs'}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-black text-white italic tracking-tighter">₹{p.price.toFixed(2)}</p>
                            <p className={`text-[9px] font-bold mt-0.5 ${isOutOfStock ? 'text-rose-500' : 'text-cyan-500'}`}>+{p.gstPercentage}% Tax</p>
                          </div>
                          <div className={`ml-5 w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            isOutOfStock ? 'bg-rose-500/10 text-rose-500/50' : 'bg-slate-950 text-slate-600 group-hover/prod:bg-cyan-500 group-hover/prod:text-slate-950'
                          }`}>
                            {isOutOfStock ? <Info size={14} /> : <Plus size={16} />}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center opacity-20">
                      <Box size={48} className="mx-auto text-slate-700" />
                      <p className="text-[10px] font-black uppercase mt-4 tracking-widest">No stock matches</p>
                    </div>
                  )}
                </div>

                {productTotalPages > 1 && (
                  <div className="flex items-center justify-between px-2 pt-2">
                    <button
                      disabled={productPage === 0}
                      onClick={() => fetchProductSuggestions(productSearch, productPage - 1)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold uppercase transition hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      {productPage + 1} / {productTotalPages}
                    </span>
                    <button
                      disabled={productPage >= productTotalPages - 1}
                      onClick={() => fetchProductSuggestions(productSearch, productPage + 1)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold uppercase transition hover:bg-slate-700 disabled:opacity-30"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
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

        {/* Right Column: Sidebar */}
        <div className="space-y-8 lg:col-span-1">
          <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-inner">
                <FileText size={20} />
              </div>
              <h2 className="text-lg font-bold text-white font-syne">Bill Summary</h2>
            </div>

            <div className="space-y-3 mb-0">
              <div className="flex justify-between text-sm text-slate-500">
                <span className="font uppercase tracking-widest text-[13px]">Items</span>
                <span className="text-white font-black">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span className="font uppercase tracking-widest text-[13px]">Base Value</span>
                <span className="text-slate-300 font-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span className="font uppercase tracking-widest text-[13px]">Discount</span>
                <span className="text-emerald-500/80 font-bold">- ₹{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span className="font uppercase tracking-widest text-[13px]">Tax Charged</span>
                <span className="text-slate-300 font-bold">₹{totalTax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-800 pt-6 mt-6">
                <span className="text-[13px] font-bold uppercase tracking-widest text-slate-500">Total Payable</span>
                <span className="text-xl font-black text-white tracking-tighter">₹{finalTotal.toFixed(2)}</span>
              </div>

              <Button
                size="lg"
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 mt-4 ${isSubmitting || items.length === 0 || (!selectedCustomer && !customerSearch) ? 'bg-slate-800 text-slate-600' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_10px_40px_rgba(6,182,212,0.3)]'}`}
                icon={isSubmitting ? Loader2 : Save}
                disabled={isSubmitting || items.length === 0 || (!selectedCustomer && !customerSearch)}
                onClick={handleCreateInvoice}
              >
                {isSubmitting ? 'PROCESSING' : 'PLACE ORDER'}
              </Button>
            </div>
          </div>

          {/* Approved Discounts Card */}
          {selectedCustomer && selectedCustomer.phone !== '1111111111' && (
            <div className="p-6 rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-right-2 duration-400">
              <h2 className="text-lg font-bold text-white font-syne px-2 mb-2">Approved Discounts</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{billingType === 'B2B' ? 'Corporate Flat Discount' : 'Overall Client Discount'}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 tracking-tight">
                        {billingType === 'B2B' ? `Approved for ${selectedCustomer.customer?.company || 'Organization'}` : 'Applied to entire bill'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        key={`overall-${overrideDiscount}`}
                        defaultValue={overrideDiscount}
                        onBlur={(e) => handleUpdateDiscount(null, e.target.value)}
                        className="w-14 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-xs font-black text-indigo-400 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>
                </div>

                {/* Specific product discounts for B2C */}
                {billingType === 'B2C' && selectedCustomer.configuredDiscounts && selectedCustomer.configuredDiscounts.filter(d => d.agreedDiscount > 0).length > 0 && (
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest px-2">Product Rewards</p>
                    {selectedCustomer.configuredDiscounts.filter(d => d.agreedDiscount > 0).map(disc => (
                      <div key={disc.productId} className="p-4 rounded-2xl bg-slate-950/30 border border-slate-800 hover:border-indigo-500/30 transition-all flex items-center justify-between group/disc">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-200 truncate">{disc.name}</p>
                          {disc.alias && <p className="text-[10px] text-slate-600 font-mono italic mt-0.5">{disc.alias}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={disc.agreedDiscount}
                            onBlur={(e) => handleUpdateDiscount(disc.productId, e.target.value)}
                            className="w-14 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-xs font-black text-indigo-400 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManualBilling

