import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Filter, Box, Trash2, Edit3,
  Package, Tag, IndianRupee, Layers, CheckCircle2,
  XCircle, Info, Loader2, MoreVertical, X, ChevronDown
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { backendClient } from '../api/axios'
import Button from '../components/ui/Button'

// ── Validation Schema ────────────────────────────────────────────────────────
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  alias: z.string().nullish().or(z.literal('')),
  description: z.string().nullish().or(z.literal('')),
  price: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: 'Price is required' }).min(0.01, 'Price must be positive')
  ),
  gstPercentage: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().min(0, 'GST % cannot be negative').max(100, 'GST % cannot exceed 100')
  ),
  sku: z.string().nullish().or(z.literal('')),
  unit: z.string().nullish().or(z.literal('')),
  status: z.enum(['AVAILABLE', 'OUT_OF_STOCK']).default('AVAILABLE'),
})

// ── Product Modal Component ──────────────────────────────────────────────────
function ProductModal({ isOpen, onClose, product, onSave }) {
  const isEditing = !!product

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: '',
      alias: '',
      description: '',
      price: 0,
      gstPercentage: 0,
      sku: '',
      unit: 'Piece',
      status: 'AVAILABLE',
    },
  })

  // Synchronize form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: product?.name || '',
        alias: product?.alias || '',
        description: product?.description || '',
        price: product?.price || 0,
        gstPercentage: product?.gstPercentage || 0,
        sku: product?.sku || '',
        unit: product?.unit || 'Pcs',
        status: product?.status || 'AVAILABLE',
      })
    }
  }, [isOpen, product, reset])

  const onSubmit = async (data) => {
    try {
      await onSave(data)
      onClose()
    } catch (err) {
      // Errors handled in parent
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white font-syne">
              {isEditing ? 'Update Product' : 'Add New Product'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name (Read-only if editing as per user requirement) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Product Name
                </label>
                <div className="relative">
                  <Package size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Graphic Card RTX 4070"
                    disabled={isEditing}
                    className={`
                      w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-800/50 border text-sm transition
                      ${isEditing ? 'border-slate-800 text-slate-500 cursor-not-allowed' : 'border-slate-800 focus:border-cyan-500/50 text-white outline-none ring-2 ring-cyan-500/10'}
                      ${errors.name ? 'border-rose-500/60' : ''}
                    `}
                  />
                </div>
                {errors.name && <p className="mt-2 text-xs text-rose-400">{errors.name.message}</p>}
                {isEditing && (
                  <p className="mt-2 text-[10px] text-slate-600 italic">Editing product name is not permitted.</p>
                )}
              </div>

              {/* Voice Nickname / Alias */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider font-syne flex items-center gap-1.5">
                  Voice Nickname <span className="text-[10px] text-cyan-500 lowercase font-normal">(Alias)</span>
                </label>
                <div className="relative">
                  <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    {...register('alias')}
                    placeholder="e.g. Maska Chaska"
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-800/50 border text-sm text-white focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/10 transition ${errors.alias ? 'border-rose-500/60' : 'border-slate-800'
                      }`}
                  />
                </div>
                {errors.alias && <p className="mt-2 text-xs text-rose-400">{errors.alias.message}</p>}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  SKU / Code
                </label>
                <input
                  type="text"
                  {...register('sku')}
                  placeholder="VB-001"
                  className={`w-full px-4 py-3 rounded-2xl bg-slate-800/50 border text-sm text-white focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/10 transition ${errors.sku ? 'border-rose-500/60' : 'border-slate-800'
                    }`}
                />
                {errors.sku && <p className="mt-2 text-xs text-rose-400">{errors.sku.message}</p>}
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Unit
                </label>
                <input
                  type="text"
                  {...register('unit')}
                  placeholder="e.g. Kg, Pcs, Box"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-sm text-white focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/10 transition"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Unit Price (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    {...register('price')}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-sm text-white focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/10 transition"
                  />
                </div>
                {errors.price && <p className="mt-2 text-xs text-rose-400">{errors.price.message}</p>}
              </div>

              {/* GST */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  GST (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('gstPercentage')}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-sm text-white focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/10 transition"
                />
                {errors.gstPercentage && <p className="mt-2 text-xs text-rose-400">{errors.gstPercentage.message}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-sm text-white focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/10 transition"
                >
                  <option value="AVAILABLE" className="bg-slate-900 text-white">Available</option>
                  <option value="OUT_OF_STOCK" className="bg-slate-900 text-white">Out Of Stock</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  {...register('description')}
                  placeholder="Additional details about the product..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-sm text-white focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/10 transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 transition text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Main Products Component ──────────────────────────────────────────────────
export default function Products() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const fetchProductsList = useCallback(async (search = '', page = 0) => {
    setIsLoading(true)
    try {
      const response = await backendClient.get('/products', {
        params: {
          search,
          status: statusFilter || undefined,
          page,
          size: 5
        }
      })
      const data = response.data?.data;
      setProducts(data?.content || [])
      setTotalPages(data?.totalPages || 0)
      setTotalElements(data?.totalElements || 0)
    } catch (err) {
      console.error('Failed to fetch products:', err)
      toast.error('Failed to load product catalogue')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  // Debounced search effect
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchProductsList(searchTerm, currentPage)
    }, 400)
    return () => clearTimeout(delay)
  }, [searchTerm, statusFilter, currentPage, fetchProductsList])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, statusFilter])

  const handleSave = async (data) => {
    try {
      if (editingProduct) {
        await backendClient.put(`/products/${editingProduct.id}`, data)
        toast.success('Product updated successfully')
      } else {
        await backendClient.post('/products', data)
        toast.success('New product added')
      }
      setIsModalOpen(false)
      fetchProductsList(searchTerm)
    } catch (err) {
      const msg = err.response?.data?.message || 'Save operation failed'
      toast.error(msg)
      throw err
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) return
    try {
      await backendClient.delete(`/products/${id}`)
      toast.success('Product removed from system')
      fetchProductsList(searchTerm)
    } catch (err) {
      console.error('Hard delete failed:', err)
      toast.error('Failed to delete product')
    }
  }

  return (
    <div className="space-y-8 font-dm min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-syne text-white tracking-tight">Catalogs</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Manage your inventory, pricing, and tax configurations
          </p>
        </div>
        <Button
          icon={Plus}
          size="lg"
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-2xl transition shadow-xl shadow-cyan-500/20"
        >
          Add Product
        </Button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-stretch">

        {/* Search Bar Container */}
        <div className="relative flex-[2] group min-h-[54px]">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search
              size={18}
              className="text-slate-500 group-focus-within:text-cyan-400 transition-colors"
            />
          </div>
          <input
            type="text"
            placeholder="Search by name, description, or SKU..."
            className="w-full h-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-4 focus:ring-cyan-500/5 transition-all backdrop-blur-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filter Container */}
        <div className="relative flex-1 md:max-w-[200px] group min-h-[54px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-full px-5 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/40 transition-all backdrop-blur-sm appearance-none cursor-pointer pr-10"
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available Only</option>
            <option value="OUT_OF_STOCK">Out Of Stock Only</option>
          </select>
          {/* This absolute wrapper ensures the arrow is perfectly centered vertically */}
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronDown
              size={16}
              className="text-slate-500 group-hover:text-cyan-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="relative rounded-[2.5rem] bg-slate-900/30 border border-slate-800/50 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Item Details</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Price</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Tax</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Inventory Info</th>
                <th className="px-6 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-cyan-500 animate-spin" />
                      <p className="text-sm text-slate-500 font-syne animate-pulse">Building your catalog...</p>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Package size={48} className="text-slate-600" />
                      <div>
                        <p className="text-lg font-bold text-slate-400 font-syne">No products found</p>
                        <p className="text-sm text-slate-600 italic">Try searching for something else or add a new item.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-slate-800/20 transition-all duration-300"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-500 border border-slate-700/50 group-hover:border-cyan-500/30 transition shadow-lg">
                          <Tag size={18} />
                        </div>
                        <div className="max-w-[180px]">
                          <p className="font-bold text-white text-base tracking-tight leading-tight">{item.name}</p>
                          {item.alias && (
                            <p className="text-[10px] font-bold text-cyan-400/70 tracking-tight uppercase leading-none mt-1 group-hover:text-cyan-400 transition-colors">
                              AKA: {item.alias}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {item.description || "No description provided"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Column 1: Unit Price */}
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-1.5 font-bold text-white text-lg tracking-tighter">
                        <IndianRupee size={14} className="text-cyan-500" />
                        {item.price.toFixed(2)}
                      </div>
                    </td>

                    {/* Column 2: GST as Text */}
                    <td className="px-6 py-6">
                      <span className="text-sm font-semibold text-slate-300">
                        {item.gstPercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">SKU</p>
                          <p className="text-sm text-slate-300 font-mono">{item.sku || 'N/A'}</p>
                        </div>
                        <div className="w-px h-6 bg-slate-800" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Unit</p>
                          <p className="text-sm text-slate-400">{item.unit || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`
                        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${item.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_-5px_theme(colors.emerald.500)]'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_-5px_theme(colors.rose.500)]'
                        }
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 transition-all duration-300">
                        <button
                          onClick={() => { setEditingProduct(item); setIsModalOpen(true); }}
                          className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition shadow-sm border border-slate-800/50"
                          title="Edit Product"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2.5 rounded-xl bg-slate-800/30 text-slate-500 hover:text-rose-500 hover:bg-rose-950/20 transition shadow-sm border border-slate-800/50"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-6 border-t border-slate-800/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-300">{(currentPage * 5) + 1}</span> to <span className="text-slate-300">{Math.min((currentPage + 1) * 5, totalElements)}</span> of <span className="text-slate-300">{totalElements}</span> items
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

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSave={handleSave}
      />
    </div>
  )
}
