import React, { useState, useEffect } from 'react';
import {
  User,
  Store,
  Mail,
  Phone,
  Lock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Building2,
  Home,
  Navigation,
  Map as MapIcon
} from 'lucide-react';
import { backendClient } from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

export default function Profile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    shopName: '',
    email: '',
    phoneNo: '',
    isGstRegistered: false,
    gstNo: '',
    doorNo: '',
    streetName: '',
    landmark: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [initialGstNo, setInitialGstNo] = useState('');

  useEffect(() => {
    console.log('Profile component mounted');
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    console.log('Fetching profile data...');
    try {
      const { data } = await backendClient.get('/profile');
      console.log('Profile data received:', data);
      const profile = data.data;
      setFormData(prev => ({
        ...prev,
        ...profile,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setInitialGstNo(profile.gstNo || '');
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      // Reset city if state changes
      if (name === 'state') newData.city = '';
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('A valid Email ID is mandatory');
      return;
    }
    if (!formData.phoneNo || !/^\d{10}$/.test(formData.phoneNo)) {
      toast.error('A valid 10-digit Phone Number is mandatory');
      return;
    }
    if (formData.gstNo && !formData.shopName) {
      toast.error('Shop Name (Company Name) is required when GSTIN is provided');
      return;
    }
    if (formData.isGstRegistered) {
      if (!formData.gstNo) {
        toast.error('GST Number is required for registered stores');
        return;
      }
      if (!formData.state || !formData.city || !formData.pincode) {
        toast.error('State, City, and Pincode are mandatory for GST registered stores');
        return;
      }
    }

    if (isChangingPassword) {
      if (!formData.currentPassword || !formData.newPassword) {
        toast.error('Please fill both password fields');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setIsSaving(true);
    try {
      const resp = await backendClient.put('/profile', formData);
      // Update global store so changes reflect immediately in invoices
      useAuthStore.setState({ user: resp.data?.data });
      toast.success('Profile updated successfully');
      setInitialGstNo(resp.data.data.gstNo);
      setIsChangingPassword(false);
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isGstLocked = !!initialGstNo;

  const STATE_CITY_MAP = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    "Haryana": ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi"],
    "Jharkhand": ["Jamshedpur", "Dhanbad", "Ranchi", "Bokaro", "Deoghar"],
    "Karnataka": ["Bangalore", "Hubli-Dharwad", "Mysore", "Gulbarga", "Mangalore"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
    "Manipur": ["Imphal", "Thoubal"],
    "Meghalaya": ["Shillong", "Tura"],
    "Mizoram": ["Aizawl", "Lunglei"],
    "Nagaland": ["Dimapur", "Kohima"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer"],
    "Sikkim": ["Gangtok", "Namchi"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    "Telanagana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam"],
    "Tripura": ["Agartala", "Udaipur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
    "Andaman and Nicobar Islands": ["Port Blair"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
    "Delhi": ["New Delhi", "Delhi NCR"],
    "Jammu and Kashmir": ["Srinagar", "Jammu"],
    "Ladakh": ["Leh", "Kargil"],
    "Lakshadweep": ["Kavaratti"],
    "Puducherry": ["Puducherry", "Karaikal"]
  };

  const INDIAN_STATES = Object.keys(STATE_CITY_MAP).sort();

  const getCities = () => {
    return STATE_CITY_MAP[formData.state] || [];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 font-dm pb-20">
      <div>
        <h1 className="px-2 text-xl font-black text-white font-syne">User Profile</h1>
        <p className="px-2 text-sm text-slate-500 mt-1">Manage your shop identity, billing information and security.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Core Info */}
        <div className="lg:col-span-2 space-y-8">

          {/* Business Identity */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <Store size={20} />
              </div>
              <h3 className="font-syne font-bold text-white text-lg tracking-tight">Shop Identity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={16} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-cyan-500/40 focus:outline-none transition-all"
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Shop Name</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={16} />
                  <input
                    type="text"
                    name="shopName"
                    value={formData.shopName || ''}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-cyan-500/40 focus:outline-none transition-all"
                    placeholder="E.g. Apple Solutions"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group opacity-60">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/20 border border-slate-800 rounded-2xl text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400" size={16} />
                  <input
                    type="tel"
                    name="phoneNo"
                    value={formData.phoneNo || ''}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-cyan-500/40 focus:outline-none transition-all"
                    placeholder="10-digit phone"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <MapPin size={20} />
              </div>
              <h3 className="font-syne font-bold text-white text-lg tracking-tight">Address Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Door No</label>
                <input
                  type="text"
                  name="doorNo"
                  value={formData.doorNo || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-indigo-500/40 focus:outline-none transition-all"
                  placeholder="12/B"
                />
              </div>
              <div className="lg:col-span-4 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Street Name</label>
                <input
                  type="text"
                  name="streetName"
                  value={formData.streetName || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-indigo-500/40 focus:outline-none transition-all"
                  placeholder="Mount Road"
                />
              </div>
              <div className="lg:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Landmark</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-indigo-500/40 focus:outline-none transition-all"
                  placeholder="Near LIC"
                />
              </div>
              <div className="lg:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Area</label>
                <input
                  type="text"
                  name="area"
                  value={formData.area || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-indigo-500/40 focus:outline-none transition-all"
                  placeholder="Anna Salai"
                />
              </div>
              <div className="lg:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  State {formData.isGstRegistered && <span className="text-amber-500 font-bold ml-1">*</span>}
                </label>
                <select
                  name="state"
                  value={formData.state || ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-3.5 bg-slate-950/50 border rounded-2xl text-slate-200 focus:outline-none transition-all appearance-none cursor-pointer ${formData.isGstRegistered && !formData.state ? 'border-amber-500/30' : 'border-slate-800 focus:border-indigo-500/40'}`}
                >
                  <option value="" className="bg-slate-900">Select State</option>
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st} className="bg-slate-900">{st}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${!formData.state ? 'text-slate-700' : 'text-slate-500'}`}>
                  City {formData.isGstRegistered && <span className="text-amber-500 font-bold ml-1">*</span>}
                </label>
                <select
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  disabled={!formData.state}
                  className={`w-full px-4 py-3.5 bg-slate-950/50 border rounded-2xl text-slate-200 focus:outline-none transition-all appearance-none ${!formData.state ? 'cursor-not-allowed opacity-50 border-slate-800' : 'cursor-pointer'} ${formData.isGstRegistered && !formData.city ? 'border-amber-500/30' : 'border-slate-800 focus:border-indigo-500/40'}`}
                >
                  <option value="" className="bg-slate-900">{!formData.state ? 'Select State First' : 'Select City'}</option>
                  {getCities().sort().map(city => (
                    <option key={city} value={city} className="bg-slate-900">{city}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  {(formData.doorNo || formData.streetName || formData.city || formData.state) && <span className="text-amber-500 font-bold ml-1">*</span>}
                  Pincode {formData.isGstRegistered && <span className="text-amber-500 font-bold ml-1">*</span>}
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode || ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-3.5 bg-slate-950/50 border rounded-2xl text-slate-200 focus:outline-none transition-all ${formData.isGstRegistered && !formData.pincode ? 'border-amber-500/30' : 'border-slate-800 focus:border-indigo-500/40'}`}
                  placeholder="600002"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - GST & Security */}
        <div className="space-y-10">

          {/* GST Information */}
          <div className="mb-6 bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-syne font-bold text-white text-lg">GST Status</h3>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.isGstRegistered ? 'bg-amber-500 border-amber-500' : 'bg-slate-950/50 border-slate-800 group-hover:border-slate-700'}`}>
                  {formData.isGstRegistered && <ShieldCheck size={14} className="text-slate-950" />}
                </div>
                <input
                  type="checkbox"
                  name="isGstRegistered"
                  checked={formData.isGstRegistered}
                  onChange={handleChange}
                  disabled={isGstLocked}
                  className="hidden"
                />
                <span className="text-sm font-bold text-slate-300">GST Registered Store</span>
              </label>

              {formData.isGstRegistered && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">GST Number</label>
                    <input
                      type="text"
                      name="gstNo"
                      value={formData.gstNo || ''}
                      onChange={handleChange}
                      disabled={isGstLocked}
                      className={`w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-amber-500/40 focus:outline-none transition-all tracking-wider font-mono ${isGstLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                  {isGstLocked ? (
                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 flex items-start gap-3">
                      <Lock size={14} className="text-slate-500 mt-1 shrink-0" />
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-wide">Verified: Registered GST details cannot be modified for audit consistency.</p>
                    </div>
                  ) : (
                    <div className="mb-4p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-start gap-3">
                      <AlertCircle size={14} className="text-amber-500 mt-1 shrink-0" />
                      <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed uppercase tracking-wide">Warning: Ensure Accuracy. Once saved, the GST number cannot be changed.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password Security */}
          <div className="mt-2 bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <Lock size={20} />
                </div>
                <h3 className="font-syne font-bold text-white text-lg tracking-tight">Security</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:text-cyan-300 underline underline-offset-4"
              >
                {isChangingPassword ? 'Cancel' : 'Change'}
              </button>
            </div>

            <div className="space-y-6">
              {!isChangingPassword ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input
                      type="text"
                      value="••••••••••••"
                      disabled
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950/20 border border-slate-800 rounded-2xl text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in slide-in-from-top-3 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Old Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-rose-500/40 focus:outline-none transition-all placeholder:text-slate-800"
                      placeholder="Current secret"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-rose-500/40 focus:outline-none transition-all placeholder:text-slate-800"
                      placeholder="At least 8 chars"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 focus:border-rose-500/40 focus:outline-none transition-all placeholder:text-slate-800"
                      placeholder="Match new password"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${isSaving ? 'bg-slate-800 text-slate-500' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/20'}`}
            >
              {isSaving ? (
                <RotateCcw size={18} className="animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </form>
    </div>
  );
}
