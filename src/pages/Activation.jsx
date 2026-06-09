import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { 
  Activity, 
  ShieldCheck, 
  ShieldAlert,
  Calendar, 
  Clock,
  KeyRound,
  RotateCcw,
  Sparkles
} from 'lucide-react';

const Activation = () => {
  const { settings, fetchSettings } = useSettings();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [type, setType] = useState('trial'); // 'trial' or 'subscription'
  const [duration, setDuration] = useState('7_days');
  const [submitting, setSubmitting] = useState(false);

  // Sync duration selection when type changes
  useEffect(() => {
    if (type === 'trial') {
      setDuration('7_days');
    } else {
      setDuration('1_year');
    }
  }, [type]);

  const handleActivate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.post('http://localhost:5000/api/settings/activation/activate', {
        type,
        duration
      }, config);

      toast.success('System activated successfully!');
      await fetchSettings(); // refresh global settings context
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Activation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    const isConfirmed = await confirm({
      title: 'Deactivate System License?',
      message: 'WARNING: Deactivating the license will block all standard operators (cashiers, managers) from logging into or using the terminal immediately. Are you sure you want to deactivate?',
      confirmText: 'Deactivate System',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.post('http://localhost:5000/api/settings/activation/deactivate', {}, config);

      toast.success('System deactivated successfully.');
      await fetchSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Deactivation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Process subscription details for display
  const isExpired = (() => {
    if (settings?.activationStatus !== 'active') return true;
    if (settings?.activationExpiryDate) {
      const expiry = new Date(settings.activationExpiryDate);
      const now = new Date();
      return now > expiry;
    }
    return false;
  })();

  const daysRemaining = (() => {
    if (isExpired || !settings?.activationExpiryDate) return 0;
    const expiry = new Date(settings.activationExpiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  })();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Title Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Activation</h1>
            <p className="text-sm text-slate-500 font-medium">Verify license terms, manage trials, and activate commercial subscriptions.</p>
          </div>
        </div>
      </div>

      {/* Grid containing Status and Control */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">Current License Status</h3>
            
            {/* Main Status Indicator */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isExpired 
                  ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {isExpired ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
                <h4 className={`text-lg font-black tracking-tight mt-1 leading-none ${isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {isExpired ? 'INACTIVE / DEACTIVATED' : 'ACTIVE / SYSTEM LICENSED'}
                </h4>
              </div>
            </div>

            {/* License Metadata */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-400" /> License Type
                </span>
                <span className="text-slate-700 font-black uppercase tracking-wider">
                  {settings?.activationType || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> Activated On
                </span>
                <span className="text-slate-700 font-bold">
                  {formatDate(settings?.activationStartDate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Expiration Date
                </span>
                <span className="text-slate-700 font-bold">
                  {formatDate(settings?.activationExpiryDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Expiration Banner */}
          <div className="mt-8">
            {!isExpired ? (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 font-bold">Time Remaining</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{daysRemaining} Days Left</p>
              </div>
            ) : (
              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-center">
                <p className="text-xs text-rose-500 font-black uppercase tracking-widest">Access Warning</p>
                <p className="text-xs text-slate-500 mt-1 font-bold">Standard operators are currently blocked from using the system.</p>
              </div>
            )}
          </div>
        </div>

        {/* Activation Console Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <form onSubmit={handleActivate} className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">Activation Panel</h3>
              
              <div className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">License Term</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="trial">Evaluation License (Trial)</option>
                    <option value="subscription">Commercial Subscription</option>
                  </select>
                </div>

                {/* Duration Selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Term Duration</label>
                  {type === 'trial' ? (
                    <select 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="1_day">1 Day</option>
                      <option value="3_days">3 Days</option>
                      <option value="5_days">5 Days</option>
                      <option value="7_days">7 Days</option>
                      <option value="10_days">10 Days</option>
                      <option value="14_days">14 Days</option>
                    </select>
                  ) : (
                    <select 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="30_days">30 Days (1 Month)</option>
                      <option value="3_months">3 Months</option>
                      <option value="6_months">6 Months</option>
                      <option value="1_year">1 Year</option>
                      <option value="2_years">2 Years</option>
                      <option value="3_years">3 Years</option>
                      <option value="4_years">4 Years</option>
                      <option value="5_years">5 Years</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons Group */}
            <div className="mt-8 space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> Activate System
              </button>

              {!isExpired && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={submitting}
                  className="w-full bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-500 hover:text-rose-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> Deactivate License
                </button>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Activation;
