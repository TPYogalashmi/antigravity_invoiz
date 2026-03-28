import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  User, Phone, Calendar, Building2, CreditCard, MapPin,
  ShoppingBag, History, Sparkles, TrendingUp, ArrowLeft,
  ChevronRight, BadgeCheck, AlertCircle, Clock, MoreVertical,
  Loader2, CheckCircle, XCircle, Mail
} from 'lucide-react';
import { backendClient } from '../api/axios';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProductDiscount, setNewProductDiscount] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await backendClient.get(`/customers/${id}/profile`);
      const data = response.data?.data;
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch customer profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  // Derived Values
  const customer = profile?.customer;
  const isB2B = !!customer?.taxId;
  const visitsLast30Days = profile?.visitsLast30Days || 0;
  const b2bDiscount = visitsLast30Days < 10 ? 10 : 20;
  const b2cDefault = 0;
  // Prioritize manual agreedDiscount if set, then B2B tiers, then B2C default
  const currentStagedDiscount = (customer?.agreedDiscount != null && customer.agreedDiscount > 0)
    ? customer.agreedDiscount
    : (isB2B ? b2bDiscount : b2cDefault);

  useEffect(() => {
    if (customer) {
      setDiscountValue(isB2B ? b2bDiscount : (customer.agreedDiscount != null ? customer.agreedDiscount : b2cDefault));
    }
  }, [customer, isB2B, b2bDiscount]);

  const handleStatusChange = async (invoiceId, newStatus, invoiceNumber) => {
    setIsUpdating(true);
    try {
      await backendClient.patch(`/invoices/${invoiceId}/status`, null, {
        params: { status: newStatus }
      });
      toast.success(`${invoiceNumber || 'Invoice'} marked as ${newStatus.toLowerCase()}`);
      fetchProfile();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDiscount = async (val) => {
    const num = Number(val);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      toast.error('Please enter a non-negative whole number (e.g. 0, 5, 10)');
      return;
    }
    setIsUpdating(true);
    try {
      await backendClient.put(`/customers/${id}`, { ...customer, agreedDiscount: num });
      toast.success(`Default pricing updated to ${num}%`);
      setIsEditingDiscount(false);
      fetchProfile();
    } catch (err) {
      console.error('Failed to update discount:', err);
      toast.error('Failed to update discount');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProductDiscount = async (productId, val) => {
    const num = Number(val);
    if (val === '' || isNaN(num) || num < 0 || !Number.isInteger(num)) {
      toast.error('Please enter a non-negative whole number (e.g. 0, 5, 10)');
      return;
    }
    setIsUpdating(true);
    try {
      await backendClient.patch(`/customers/${id}/specific-discounts/${productId}`, null, {
        params: { discount: num }
      });
      toast.success(`Product reward updated to ${num}%`);
      setEditingProductId(null);
      fetchProfile();
    } catch (err) {
      console.error('Failed to update product discount:', err);
      toast.error('Failed to update product discount');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 size={40} className="text-cyan-500 animate-spin" /></div>;
  if (!profile) return <div className="text-center py-20 text-slate-500">Customer profile not found.</div>;

  const { totalOrders, totalSpend, avgSpend, lastVisit, visitFrequency, frequentItems, recentTransactions } = profile;
  const unpaidBillsOnly = recentTransactions.filter(tx => tx.status === 'UNPAID');
  const overdueBillsOnly = recentTransactions.filter(tx => tx.status === 'OVERDUE');

  const isWalkIn = customer?.phone === '1111111111';

  if (isWalkIn) {
    return (
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 font-dm pb-20">
        {/* Simplified Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all hover:bg-slate-800 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="font-syne text-2xl font-bold text-white tracking-tight">Walk-in Analysis</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mt-0.5">Generic Consumer Behavior Patterns</p>
          </div>
        </div>

        {/* Centralized Insight Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Identity Card */}
          <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl ">
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Customer Identity</p>
                <h2 className="text-3xl font-bold text-white font-syne tracking-tight">Walk-in</h2>
                <div className="flex items-center gap-2 text-cyan-500 font-mono text-sm mt-2 opacity-80">
                  <Phone size={14} />
                  <span>{customer.phone}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800/50">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Engagement stats</p>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Visits</span>
                    <span className="text-xl font-black text-white font-mono">{totalOrders}</span>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Frequency</span>
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{visitFrequency}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 mt-4">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                  * Note: Profile limited to generic purchase data for non-registered users.
                </p>
              </div>
            </div>
          </div>

          {/* Frequent Items Card */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-inner">
                  <ShoppingBag size={20} />
                </div>
                <h3 className="text-xl font-bold text-white font-syne tracking-tight uppercase tracking-wider">Top 5 Trending Items</h3>
              </div>
            </div>

            <div className="space-y-4">
              {frequentItems.slice(0, 5).map((item, i) => (
                <div key={i} className="group bg-slate-950/40 border border-slate-800/50 hover:border-cyan-500/30 p-5 rounded-3xl transition-all duration-300 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 font-black text-sm border border-slate-800 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-md font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{item.name}</p>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-1">{item.alias || 'REGULAR INVENTORY'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                      <p className="text-xl font-black text-white font-mono tracking-tighter">{item.avgQuantity % 1 === 0 ? item.avgQuantity : item.avgQuantity.toFixed(1)}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.unit || 'PCS'}</p>
                    </div>
                    <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest mt-0.5">Average / Bill</p>
                  </div>
                </div>
              ))}

              {frequentItems.length === 0 && (
                <div className="py-20 text-center opacity-20">
                  <ShoppingBag size={48} className="mx-auto text-slate-700 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No consumption data found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-dm pb-10">
      {/* Page Title & Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="font-syne text-2xl font-bold text-white tracking-tight">Customer Profile</h1>
            <p className="text-sm text-slate-500 mt-0.5">{isB2B ? 'Corporate behavior & purchase analysis' : 'Individual behavior & purchase analysis'}</p>
          </div>
        </div>
      </div>

      {/* Main 3-Column Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Main Dashboard Content (Left 2 Cols) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Detailed Info Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 relative overflow-hidden">

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Identity, Contact & Membership */}
                <div className="space-y-6">
                  <div>
                    <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1">Name</p>
                    <p className="text-ml text-white font-syne lowercase first-letter:uppercase mb-6">{customer.name}</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mt-4 mb-1">Phone</p>
                    <div className="flex items-center gap-2 text-slate-300 font-mono text-ml mb-6">
                      <Phone size={14} className="text-cyan-400" />
                      <span>{customer.phone || 'Not provided'}</span>
                    </div>
                  </div>
                  {isB2B && customer.email && (
                    <div>
                      <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email</p>
                      <div className="flex items-center gap-2 text-slate-300 font-mono text-ml mb-6">
                        <Mail size={16} className="text-indigo-400" />
                        <span>{customer.email}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Member Since</p>
                    <div className=" text-[13px] flex items-center gap-2 text-slate-300 font-mono text-sm">
                      <Calendar size={16} className="text-emerald-400" />
                      <span className="font-mono text-[16px]">{new Date(customer.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Business & Location */}
                <div className="space-y-6">
                  <div>
                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Account Type</p>
                    <span className={`px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest border shadow-xl ${isB2B ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'}`}>
                      {isB2B ? 'B2B Enterprise' : 'B2C Individual'}
                    </span>
                  </div>

                  {isB2B ? (
                    <>
                      <div>
                        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Company Name</p>
                        <div className="flex items-center gap-2 text-slate-300 font-mono italic text-ml">
                          <Building2 size={16} className="text-amber-400" />
                          <span>{customer.company || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">GST Number</p>
                        <div className="flex items-center gap-2 text-slate-300 font-mono text-ml">
                          <CreditCard size={16} className="text-emerald-400" />
                          <span className="font-mono text-ml">{customer.taxId || '—'}</span>
                        </div>
                      </div>
                      {(customer.address || customer.city) && (
                        <div>
                          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Address</p>
                          <div className="flex items-start gap-2 text-slate-300 font-mono text-ml">
                            <MapPin size={16} className="text-rose-400 mt-1" />
                            <div>
                              <p>{[customer.address, customer.city].filter(Boolean).join(', ')}</p>
                              {customer.state && (
                                <p className="text-[14px] text-slate-500 not-italic font-bold uppercase mt-1">
                                  {customer.state} {customer.postalCode ? `- ${customer.postalCode}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email</p>
                        <div className="flex items-center gap-2 text-slate-300 font-mono text-ml">
                          <Mail size={16} className="text-indigo-400" />
                          <span>{customer.email || '—'}</span>
                        </div>
                      </div>
                      {(customer.address || customer.city) && (
                        <div>
                          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Location Details</p>
                          <div className="flex items-start gap-2 text-slate-300 font-mono text-ml">
                            <MapPin size={16} className="text-rose-400 mt-1" />
                            <div>
                              <p>{[customer.address, customer.city].filter(Boolean).join(', ')}</p>
                              {customer.state && (
                                <p className="text-[13px] text-slate-500 not-italic font-bold uppercase mt-1">
                                  {customer.state} {customer.postalCode ? `- ${customer.postalCode}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Two Boxes (Smart Pricing & Unpaid Bills) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-2xl ${isB2B ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'} flex items-center justify-center border`}>
                  <Sparkles size={20} />
                </div>
                <h3 className="font-syne font-bold text-white">{isB2B ? 'B2B Discounts' : 'B2C Targeted Reward'}</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Rate</p>
                    <p className={`text-2xl font-black font-mono ${isB2B ? 'text-amber-400' : 'text-indigo-400'}`}>{currentStagedDiscount}%</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${isB2B ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, currentStagedDiscount * 4)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-slate-800/20 border-slate-700/50">
                  <div className="flex items-center gap-2 mb-0">
                    <TrendingUp size={12} className={isB2B ? 'text-amber-400' : 'text-emerald-400'} />
                    <p className={`text-[10px] font-bold uppercase ${isB2B ? 'text-amber-500' : 'text-indigo-300'}`}>{isB2B ? 'Volume Strategy' : 'Product Strategy'}</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed text-sm">
                    {isB2B
                      ? `${profile.visitsLast30Days < 10 ? 'Initial tier (10%)' : 'Elite tier (20%)'} mapped manually to all B2B orders.`
                      : `This is the default reward rate applied for frequently bought products. You can also set specific rates for them individual in the adjacent tab.`
                    }
                  </p>
                </div>

                {isEditingDiscount ? (
                  <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                      placeholder="%"
                    />
                    <button
                      onClick={() => handleUpdateDiscount(discountValue)}
                      className="px-4 py-2 bg-indigo-500 text-slate-950 font-bold text-[10px] uppercase rounded-xl transition-all hover:scale-105 active:scale-95"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingDiscount(true)}
                    className="w-full py-3 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl border border-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    Customize Default
                  </button>
                )}
              </div>
            </div>

            <div className={`bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2.5rem] p-4 shadow-2xl`}>
              <h3 className="font-syne font-bold text-white px-6 mb-10 mt-4 text-lg">
                Frequently Bought Items
              </h3>

              <div className="space-y-4">
                {frequentItems.slice(0, 3).map((item, i) => (
                  <div key={i} className="group/item">
                    <div className="flex items-center justify-between text-sm mb-6">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-bold px-8">{item.name}</span>
                        <span className="text-[13px] text-slate-500  font-mono px-8">
                          {item.avgQuantity != null
                            ? (item.avgQuantity % 1 === 0 ? item.avgQuantity : item.avgQuantity.toFixed(1))
                            : item.count} qty avg
                        </span>
                      </div>

                      {!isB2B && (
                        <div className="flex items-center gap-2">
                          {editingProductId === item.productId ? (
                            <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                              <input
                                type="number"
                                autoFocus
                                value={newProductDiscount}
                                onChange={(e) => setNewProductDiscount(e.target.value)}
                                className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[12px] font-bold text-white focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                onClick={() => handleUpdateProductDiscount(item.productId, newProductDiscount)}
                                className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-slate-950 transition"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                className="p-1.5 bg-slate-800 text-slate-500 rounded-lg hover:text-white transition"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end ml-6">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reward</span>
                                <span className={`text-xs font-black ${item.agreedDiscount != null ? 'text-indigo-400' : 'text-slate-600'}`}>
                                  {item.agreedDiscount ?? customer.agreedDiscount ?? 0}%
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingProductId(item.productId);
                                  setNewProductDiscount(item.agreedDiscount ?? customer.agreedDiscount ?? 0);
                                }}
                                className="p-2 rounded-xl bg-slate-800/50 text-slate-500 hover:text-white opacity-0 group-hover/item:opacity-100 transition-all shadow-xl"
                              >
                                <Sparkles size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="h-px bg-slate-800/30 w-full" />
                  </div>
                ))}

                {frequentItems.length === 0 && (
                  <p className="text-slate-600 italic text-sm text-center py-4">No data yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Unpaid Bills Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 h-[340px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Clock size={20} />
                  </div>
                  <h3 className="font-syne font-bold text-white text-lg">Unpaid Bills</h3>
                </div>
                <span className="bg-amber-500/10 text-amber-500 font-black px-3 py-1 rounded-full border border-amber-500/20 tabular-nums">
                  {unpaidBillsOnly.length}
                </span>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {unpaidBillsOnly.map((bill) => (
                  <div key={bill.id} className="p-4 rounded-xl bg-slate-800/20 border border-slate-800/50 flex flex-col gap-3 group/bill">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-white font-mono">
                        <p className="text-xs font-bold">{bill.invoiceNumber}</p>
                        <p className="text-sm font-black">₹{bill.finalAmount?.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <p>Issued: {new Date(bill.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                        <p className="text-amber-500/80">Due: {new Date(bill.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => handleStatusChange(bill.id, 'PAID', bill.invoiceNumber)}
                        className="py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 transition-all uppercase tracking-tighter"
                      >
                        Paid
                      </button>
                      <button
                        onClick={() => handleStatusChange(bill.id, 'CANCELLED', bill.invoiceNumber)}
                        className="py-1.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all uppercase tracking-tighter"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
                {unpaidBillsOnly.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic gap-2 h-full">
                    <CheckCircle size={24} className="opacity-20" />
                    <p className="text-sm">No pending bills</p>
                  </div>
                )}
              </div>
            </div>

            {/* Overdue Bills Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 h-[340px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <AlertCircle size={20} />
                  </div>
                  <h3 className="font-syne font-bold text-white text-lg">Overdue</h3>
                </div>
                <span className="bg-rose-500/10 text-rose-500 font-black px-3 py-1 rounded-full border border-rose-500/20 tabular-nums">
                  {overdueBillsOnly.length}
                </span>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {overdueBillsOnly.map((bill) => (
                  <div key={bill.id} className="p-4 rounded-xl bg-slate-800/20 border border-slate-800/50 flex flex-col gap-3 group/bill">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-white font-mono">
                        <p className="text-xs font-bold">{bill.invoiceNumber}</p>
                        <p className="text-sm font-black text-rose-400">₹{bill.finalAmount?.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <p>Issued: {new Date(bill.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                        <p className="text-rose-500/80">Lapsed: {new Date(bill.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStatusChange(bill.id, 'PAID', bill.invoiceNumber)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-700 hover:bg-slate-700 hover:text-white transition-all font-syne uppercase tracking-wider"
                    >
                      Mark as Paid
                    </button>
                  </div>
                ))}
                {overdueBillsOnly.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic gap-2 h-full">
                    <BadgeCheck size={24} className="opacity-20 text-emerald-500" />
                    <p className="text-sm text-center">Perfect! Nothing overdue</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar Summary (Right 1 Col) */}
        <div className="lg:col-span-1 space-y-6 pr-1">

          {/* Purchase Summary */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[1.5rem] p-4 shadow-xl mb-6">
            <h3 className="font-syne font-bold text-white mb-4 text-[18px] "> Purchase Summary</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[14px] font-bold text-slate-600 uppercase">Total Orders</p>
                  <p className="text-xl font-black text-white font-mono">{totalOrders}</p>
                </div>
                <div className="p-2 bg-white/5 rounded-xl">
                  <ShoppingBag size={22} className="text-indigo-400" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-slate-500 font-bold">Total Spend</span>
                  <span className="text-white font-black font-mono">₹{totalSpend?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] border-b border-slate-800 pb-2 mb-2 ">
                  <span className="text-slate-500 font-bold">Avg Spend</span>
                  <span className="text-white font-black font-mono">₹{avgSpend?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] ">
                  <span className="text-slate-500 font-bold">Last Visit</span>
                  <span className="text-slate-300 font-mono text-[17px]">{lastVisit ? new Date(lastVisit).toLocaleDateString('en-GB') : 'Never'}</span>
                </div>

                <div className="pt-2">
                  <p className="text-[12px] font-bold text-slate-600 uppercase tracking-widest mb-1 transition-opacity group-hover:opacity-100">Visit Frequency</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px] ${visitFrequency === 'Frequent' ? 'bg-emerald-500 shadow-emerald-500/50' : visitFrequency === 'Regular' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-rose-500 shadow-rose-500/50'}`} />
                      <span className="text-white text-[13px] font-black uppercase tracking-wider">{visitFrequency}</span>
                    </div>
                    <span className="text-slate-500 text-[14px] font-mono mb-2">{profile.visitsLast30Days} visits/mon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[1.5rem] p-4 shadow-xl h-[320px] flex flex-col">
            <h3 className="font-syne font-bold text-white mb-4 text-[17px] flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              Recent History
            </h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-slate-800/50 hover:border-slate-700 transition-colors">
                  <div>
                    <p className="text-[16px] font-black text-white font-mono mb-0.5">{tx.invoiceNumber}</p>
                    <p className="text-[14px] text-slate-500 font-bold uppercase">{new Date(tx.issueDate).toLocaleDateString('en-GB')}</p>
                  </div>
                  <p className="text-[18px] font-bold text-indigo-400 font-mono">₹{tx.finalAmount?.toLocaleString('en-IN')}</p>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-slate-600 italic text-[10px] text-center py-2">No history.</p>
              )}
            </div>
          </div>

          {/* Active Rewards (Moved to Sidebar) */}
          {!isB2B && (
            <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[1.5rem] p-4 shadow-xl h-[330px] flex flex-col">
              <div className="flex items-center justify-between mb-4 pt-2 px-2">
                <h3 className="font-syne font-bold text-white text-[17px]">Active and Past Rewards</h3>
                <BadgeCheck size={18} className="text-indigo-400" />
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {(() => {
                  const active = (profile.configuredDiscounts || []).filter(d => d.agreedDiscount > 0);
                  const past = (profile.configuredDiscounts || []).filter(d => d.agreedDiscount === 0);

                  if (active.length === 0 && past.length === 0) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic gap-2 h-full py-10">
                        <Sparkles size={24} className="opacity-20" />
                        <p className="text-[11px] text-center">No rewards set yet for this customer.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {active.length > 0 && (
                        <div className="space-y-3">
                          {active.map((item) => (
                            <div key={item.productId} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-200 truncate pr-2">{item.name}</p>
                                <span className="text-[10px] font-black font-mono text-indigo-400">{item.agreedDiscount}%</span>
                              </div>
                              {editingProductId === `conf-${item.productId}` ? (
                                <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-indigo-500/30">
                                  <input
                                    type="number"
                                    value={newProductDiscount}
                                    onChange={(e) => setNewProductDiscount(e.target.value)}
                                    className="flex-1 bg-transparent text-xs font-mono text-white outline-none"
                                    autoFocus
                                    placeholder="%"
                                  />
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleUpdateProductDiscount(item.productId, newProductDiscount)}
                                      className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <CheckCircle size={14} />
                                    </button>
                                    <button
                                      onClick={() => setEditingProductId(null)}
                                      className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingProductId(`conf-${item.productId}`); setNewProductDiscount(item.agreedDiscount); }}
                                  className="w-full py-1.5 rounded-lg bg-slate-800/50 text-[10px] font-bold text-slate-500 hover:text-white transition uppercase"
                                >Modify</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {past.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">Past Rewards</p>
                          {past.map((item) => (
                            <div key={item.productId} className="p-3 rounded-xl bg-slate-950/20 border border-slate-800/40 flex flex-col gap-2 opacity-60 hover:opacity-100 transition-opacity">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500 truncate pr-2">{item.name}</p>
                                <span className="text-[10px] font-black font-mono text-slate-600">0%</span>
                              </div>
                              {editingProductId === `conf-${item.productId}` ? (
                                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-indigo-500/30">
                                  <input
                                    type="number"
                                    value={newProductDiscount}
                                    onChange={(e) => setNewProductDiscount(e.target.value)}
                                    className="flex-1 bg-transparent text-xs font-mono text-white outline-none"
                                    autoFocus
                                    placeholder="%"
                                  />
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleUpdateProductDiscount(item.productId, newProductDiscount)}
                                      className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <CheckCircle size={14} />
                                    </button>
                                    <button
                                      onClick={() => setEditingProductId(null)}
                                      className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingProductId(`conf-${item.productId}`); setNewProductDiscount(0); }}
                                  className="w-full py-1.5 rounded-lg bg-slate-900 text-[10px] font-bold text-slate-700 hover:text-indigo-400 transition uppercase"
                                >Re-activate</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
