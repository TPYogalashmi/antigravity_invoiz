import { Users, Plus, Search, Mail, Phone, MapPin, MoreVertical, Trash2, Edit2, AlertCircle, Loader2 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Button from '../components/ui/Button'
import { backendClient } from '../api/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'

// ── Data ──────────────────────────────────────────────────────────────────
const INDIAN_STATES_CITIES = {
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"],
  "Kerala": ["Kochi", "Trivandrum", "Kozhikode", "Thrissur", "Kollam"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida"]
};

// ── Validation Schema ────────────────────────────────────────────────────────
const customerSchema = z.object({
  name: z.string()
    .min(3, 'At least 3 characters are required'),
  email: z.string()
    .email('Invalid email address')
    .or(z.literal(''))
    .nullable(),
  phone: z.string()
    .min(1, 'Phone number is required')
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  company: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().default('India'),
  postalCode: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  hasGst: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.hasGst) {
    if (!data.company || data.company.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company Name is compulsory for GST billing",
        path: ["company"],
      });
    }
    if (!data.taxId || data.taxId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GST Number is compulsory for GST billing",
        path: ["taxId"],
      });
    }
  }
});

// ── Customer Modal Component ──────────────────────────────────────────────────
function CustomerModal({ isOpen, onClose, customer, onSave }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      postalCode: '',
      taxId: '',
      notes: '',
      status: 'ACTIVE',
      hasGst: false,
    },
  })

  const selectedState = watch('state');
  const hasGst = watch('hasGst');

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        // Transform null values to empty strings for form inputs
        const normalized = Object.entries(customer).reduce((acc, [key, val]) => {
          acc[key] = val === null ? '' : val;
          return acc;
        }, {});

        reset({
          ...normalized,
          hasGst: !!(customer.taxId || customer.company)
        });
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          company: '',
          address: '',
          city: '',
          state: '',
          country: 'India',
          postalCode: '',
          taxId: '',
          notes: '',
          status: 'ACTIVE',
          hasGst: false,
        });
      }
    }
  }, [isOpen, customer, reset])

  if (!isOpen) return null

  return (
    <div className="fixed top-16 bottom-0 right-0 lg:left-64 left-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] w-full max-w-[70vw] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <h2 className="font-syne text-xl font-bold text-white">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  {...register('name')}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                  placeholder="e.g. Rahul Kumar Singh"
                />
                {errors.name && <p className="text-rose-500 text-[10px] mt-1 ml-1 font-medium">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Email Address <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  {...register('email')}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                  placeholder="billing@company.com"
                />
                {errors.email && <p className="text-rose-500 text-[10px] mt-1 ml-1 font-medium">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Phone (10 Digits)
                </label>
                <input
                  {...register('phone')}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                  placeholder="9876543210"
                />
                {errors.phone && <p className="text-rose-500 text-[10px] mt-1 ml-1 font-medium">{errors.phone.message}</p>}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasGst"
                  {...register('hasGst')}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/40"
                />
                <label htmlFor="hasGst" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Has GST Number?
                </label>
              </div>

              {hasGst && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register('company')}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                      placeholder="e.g. Acme Corporation"
                    />
                    {errors.company && <p className="text-rose-500 text-[10px] mt-1 ml-1 font-medium">{errors.company.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                      GST Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register('taxId')}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                      placeholder="e.g. 33ABCDE1234F1Z5"
                    />
                    {errors.taxId && <p className="text-rose-500 text-[10px] mt-1 ml-1 font-medium">{errors.taxId.message}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Address & Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition appearance-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Street Address
                </label>
                <input
                  {...register('address')}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                  placeholder="Door No, Building, Area"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                    State <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <select
                    {...register('state')}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition appearance-none"
                    onChange={(e) => {
                      setValue('city', '');
                      register('state').onChange(e);
                    }}
                  >
                    <option value="">Select State</option>
                    {Object.keys(INDIAN_STATES_CITIES).sort().map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                    City / District
                  </label>
                  <select
                    {...register('city')}
                    disabled={!selectedState}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition appearance-none disabled:opacity-50"
                  >
                    <option value="">Select City</option>
                    {selectedState && INDIAN_STATES_CITIES[selectedState]?.sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Postal Code
                </label>
                <input
                  {...register('postalCode')}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                  placeholder="600001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Private Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Add any internal details here..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {customer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Customers Component ──────────────────────────────────────────────────
export default function Customers() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // Listen for ?create=true to open modal automatically
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('create') === 'true') {
      setEditingCustomer(null);
      setIsModalOpen(true);
    }
  }, [search]);

  const fetchCustomers = useCallback(async (search = '', page = 0) => {
    setIsLoading(true)
    try {
      const response = await backendClient.get('/customers', {
        params: { search, page, size: 6 }
      })
      // Spring Data Page object has the content array
      const data = response.data?.data;
      setCustomers(data?.content || [])
      setTotalPages(data?.totalPages || 0)
      setTotalElements(data?.totalElements || 0)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(searchTerm, currentPage)
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [searchTerm, currentPage, fetchCustomers])

  // Handle ?create=true from Voice/Manual Billing
  const location = useLocation();
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('create') === 'true') {
      setEditingCustomer(null);
      setIsModalOpen(true);
      // Clean up the URL after opening
      navigate('/customers', { replace: true });
    }
  }, [location, navigate]);

  const handleSave = async (data) => {
    // Transform empty strings to null to avoid backend validation/unique constraint issues
    const transformedData = Object.keys(data).reduce((acc, key) => {
      acc[key] = (typeof data[key] === 'string' && data[key].trim() === '') ? null : data[key];
      return acc;
    }, {});

    try {
      if (editingCustomer) {
        await backendClient.put(`/customers/${editingCustomer.id}`, transformedData)
        toast.success('Customer updated successfully')
      } else {
        await backendClient.post('/customers', transformedData)
        toast.success('Customer added successfully')
      }
      setIsModalOpen(false)
      fetchCustomers(searchTerm, currentPage)
    } catch (err) {
      console.error('Save failed:', err)
      // axios global handler will show the toast
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer? All related invoices may be affected.')) return
    try {
      await backendClient.delete(`/customers/${id}`)
      toast.success('Customer deleted(suspended)')
      fetchCustomers(searchTerm, currentPage)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (

    <div className="space-y-6 font-dm">

      {/* TOP HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">

        {/* LEFT: Title */}
        <div>
          <h1 className="font-syne text-2xl text-white">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your client relationships
          </p>
        </div>

        {/* RIGHT: Search + Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition shadow-lg"
            />
          </div>

          {/* Button */}
          <Button
            icon={Plus}
            size="md"
            onClick={() => {
              setEditingCustomer(null)
              setIsModalOpen(true)
            }}
          >
            Add Customer
          </Button>

        </div>
      </div>


      {/* Grid Display */}
      {
        isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <Loader2 className="animate-spin text-cyan-500" size={40} />
            <p className="text-slate-400 font-medium">Loading customers…</p>
          </div>
        ) : customers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {customers.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className={`relative p-6 rounded-2xl transition group overflow-hidden shadow-sm cursor-pointer border ${c.status === 'SUSPENDED'
                  ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50 hover:shadow-rose-500/5'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-cyan-500/5'
                  }`}
              >
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-10">

                  {/* Status Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${c.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : c.status === 'SUSPENDED'
                      ? 'bg-rose-950/20 text-rose-500 border-rose-500/30'
                      : 'bg-slate-700/30 text-slate-500 border-slate-700/50'
                    }`}>
                    {c.status}
                  </span>

                  {/* Icons BELOW badge */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingCustomer(c)
                        setIsModalOpen(true)
                      }}
                      className="p-1.5 rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                      title="Edit"
                    >
                      <Edit2 size={11} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(c.id)
                      }}
                      className="p-1.5 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                </div>


                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center text-lg font-bold text-white shadow-xl">
                    {c.name[0]}
                  </div>
                  <div className="max-w-[150px]">
                    <h3 className="text-base font-bold text-white truncate">{c.name}</h3>
                    <p className="flex items-center gap-1 text-[12px] text-slate-400 mt-1 truncate">
                      {c.company && (
                        <span className="font-bold text-cyan-400/80 uppercase">
                          {c.company}
                        </span>
                      )}

                      {(c.city || c.postalCode) && (
                        <>
                          <MapPin size={12} />
                          <span>
                            {c.city || 'No Location'}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>


                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-400 group/item">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover/item:text-cyan-400 transition">
                      <Mail size={12} />
                    </div>
                    <span className="truncate">{c.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 group/item">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover/item:text-cyan-400 transition">
                      <Phone size={12} />
                    </div>
                    <span>{c.phone || 'No phone provided'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-white">No customers found</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">
              {searchTerm ? `We couldn't find anything matching "${searchTerm}"` : "Start by adding your first customer to manage invoices."}
            </p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="mt-4 text-cyan-400 text-sm font-semibold hover:underline">
                Clear search
              </button>
            )}
          </div>
        )
      }

      {/* Pagination Footer */}
      {
        !isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-0 border-t border-slate-800/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Showing <span className="text-slate-300">{(currentPage * 6) + 1}</span> to <span className="text-slate-300">{Math.min((currentPage + 1) * 6, totalElements)}</span> of <span className="text-slate-300">{totalElements}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold"
              >
                Previous
              </button>
              <div className="flex gap-1 items-center px-2">
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
        )
      }

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={editingCustomer}
        onSave={handleSave}
      />
    </div >
  )
}