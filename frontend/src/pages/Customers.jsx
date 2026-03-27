import { Users, Plus, Search, Mail, Phone, MapPin, MoreVertical, Trash2, Edit2, AlertCircle, Loader2 } from 'lucide-react'
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
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
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)

  const fetchCustomers = useCallback(async (search = '') => {
    setIsLoading(true)
    try {
      const response = await backendClient.get('/customers', {
        params: { search, size: 50 }
      })
      // Spring Data Page object has the content array
      setCustomers(response.data?.data?.content || [])
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(searchTerm)
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [searchTerm, fetchCustomers])

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
      fetchCustomers(searchTerm)
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
      fetchCustomers(searchTerm)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div className="space-y-6 font-dm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your client relationships</p>
        </div>
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

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition shadow-lg"
        />
      </div>

      {/* Grid Display */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
          <Loader2 className="animate-spin text-cyan-500" size={40} />
          <p className="text-slate-400 font-medium">Loading customers…</p>
        </div>
      ) : customers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {customers.map((c) => (
            <div key={c.id} className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition group overflow-hidden shadow-sm hover:shadow-cyan-500/5">

              {/* Status Badge */}
              <div className="absolute top-6 right-6">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${c.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : c.status === 'SUSPENDED' // Now specifically checking for SUSPENDED to show Red
                    ? 'bg-rose-950/20 text-rose-500 border-rose-500/30'
                    : 'bg-slate-700/30 text-slate-500 border-slate-700/50' // Default style for others (INACTIVE, etc.)
                  }`}>
                  {c.status}
                </span>
              </div>

              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center text-lg font-bold text-white shadow-xl">
                  {c.name[0]}
                </div>
                <div className="max-w-[150px]">
                  <h3 className="text-base font-bold text-white truncate">{c.name}</h3>
                  {c.company && (
                    <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-tight mt-0.5 truncate">{c.company}</p>
                  )}
                  <div className="flex items-center gap-1 text-slate-500 mt-1">
                    <MapPin size={10} />
                    <span className="text-[10px] truncate">
                      {c.city || 'No Location'}
                      {c.postalCode ? `, ${c.postalCode}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
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

              <div className="flex items-center justify-between pt-5 border-t border-slate-800">
                <div className="flex gap-4">
                  <div className="text-left">
                    <p className="text-xl font-bold text-white font-syne leading-none mb-1">{c.totalInvoices || 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Invoices</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingCustomer(c)
                      setIsModalOpen(true)
                    }}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                    title="Edit Customer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                    title="Delete Customer"
                  >
                    <Trash2 size={14} />
                  </button>
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
      )}

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={editingCustomer}
        onSave={handleSave}
      />
    </div>
  )
}