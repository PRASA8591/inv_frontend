import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { 
  Building2, 
  Palette, 
  ShieldAlert,
  Save,
  Globe,
  Database,
  Cpu,
  ShieldCheck,
  ChevronRight,
  Activity,
  Printer
} from 'lucide-react';
import { printService } from '../utils/printService';

const SystemSettings = () => {
  const { user } = useAuth();
  const { settings, updateSettings, loading } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    mobile: '',
    email: '',
    currency: '',
    currencySymbol: '$',
    taxRate: 0,
    theme: 'light',
    glassmorphism: false,
    animations: false,
    shopLogo: null,
    dailyStockUpdateEnabled: false,
    dailyStockUpdateQty: 100,
    dailyStockUpdateTime: '00:00',
    useBatchNumbers: true,
    useExpirationDates: true,
    useCostPrice: true
  });

  const [logoInputMode, setLogoInputMode] = useState('upload'); // 'upload' or 'url'
  const [logoUrlInput, setLogoUrlInput] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || '',
        address: settings.address || '',
        mobile: settings.mobile || '',
        email: settings.email || '',
        currency: settings.currency || 'USD',
        currencySymbol: settings.currencySymbol || '$',
        taxRate: settings.taxRate || 0,
        theme: settings.theme || 'light',
        glassmorphism: settings.glassmorphism || false,
        animations: settings.animations || false,
        shopLogo: settings.shopLogo || null,
        dailyStockUpdateEnabled: settings.dailyStockUpdateEnabled || false,
        dailyStockUpdateQty: settings.dailyStockUpdateQty || 100,
        dailyStockUpdateTime: settings.dailyStockUpdateTime || '00:00',
        useBatchNumbers: settings.useBatchNumbers !== undefined ? settings.useBatchNumbers : true,
        useExpirationDates: settings.useExpirationDates !== undefined ? settings.useExpirationDates : true,
        useCostPrice: settings.useCostPrice !== undefined ? settings.useCostPrice : true
      });
      if (settings.shopLogo) {
        if (settings.shopLogo.startsWith('data:')) {
          setLogoInputMode('upload');
          setLogoUrlInput('');
        } else {
          setLogoInputMode('url');
          setLogoUrlInput(settings.shopLogo);
        }
      } else {
        setLogoInputMode('upload');
        setLogoUrlInput('');
      }
    }
  }, [settings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      return toast.error("Logo image size must be less than 1MB.");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, shopLogo: reader.result }));
      toast.success("Logo uploaded successfully. Save settings to apply.");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (e) => {
    const url = e.target.value;
    setLogoUrlInput(url);
    setFormData(prev => ({ ...prev, shopLogo: url || null }));
  };

  const handleLogoInputModeChange = (mode) => {
    setLogoInputMode(mode);
    if (mode === 'url') {
      setFormData(prev => ({ ...prev, shopLogo: logoUrlInput || null }));
    } else {
      if (formData.shopLogo && formData.shopLogo.startsWith('data:')) {
        // Keep it
      } else if (settings?.shopLogo && settings.shopLogo.startsWith('data:')) {
        setFormData(prev => ({ ...prev, shopLogo: settings.shopLogo }));
      } else {
        setFormData(prev => ({ ...prev, shopLogo: null }));
      }
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, shopLogo: null }));
    setLogoUrlInput('');
    toast.info("Custom logo removed. Save settings to apply default.");
  };

  const handleCurrencyChange = (curCode) => {
    let symbol = '$';
    if (curCode === 'EUR') symbol = '€';
    else if (curCode === 'GBP') symbol = '£';
    else if (curCode === 'LKR') symbol = 'Rs.';
    setFormData({ ...formData, currency: curCode, currencySymbol: symbol });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const res = await updateSettings(formData);
    if (res.success) toast.success("Settings updated.");
    else toast.error(res.message || 'Failed to update settings.');
  };

  const handleTestPrint = () => {
    const dummyBill = {
      _id: 'INV-TEST-' + Math.floor(Math.random() * 90000 + 10000),
      createdAt: new Date(),
      customerName: 'Setup Validation',
      soldBy: { username: user?.username || 'System Admin' },
      items: [
        { name: 'Enterprise License Tier 1', quantity: 1, price: 1500, subtotal: 1500 },
        { name: 'Hardware Setup & Calibration', quantity: 2, price: 250, subtotal: 500 }
      ],
      subtotal: 2000,
      tax: (formData.taxRate || 0) > 0 ? (2000 * (formData.taxRate / 100)) : 0,
      discount: 0,
      get grandTotal() { return this.subtotal + this.tax - this.discount; }
    };
    printService.posReceipt(dummyBill, formData);
    toast.success(`Hardware Test Print initiated using Bill #${dummyBill._id}`);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-400 border border-white/10 shadow-inner">
            <Cpu className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">System Settings</h1>
            <p className="text-xs text-slate-300 font-medium mt-1">Configure enterprise parameters, taxation, and receipt branding.</p>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg backdrop-blur-md">
              <ShieldCheck className="w-4 h-4"/> Admin Access
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg backdrop-blur-md">
              <ShieldAlert className="w-4 h-4"/> View Only
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-3">
          <button onClick={()=>setActiveTab('general')} className={`w-full text-left p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 font-bold ${activeTab === 'general' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 translate-x-1' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}>
            <Globe className="w-5 h-5"/> General Configuration
          </button>
          <button onClick={()=>setActiveTab('display')} className={`w-full text-left p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 font-bold ${activeTab === 'display' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 translate-x-1' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}>
            <Palette className="w-5 h-5"/> Visual Preferences
          </button>
          <button onClick={()=>setActiveTab('invoice_settings')} className={`w-full text-left p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 font-bold ${activeTab === 'invoice_settings' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 translate-x-1' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}>
            <Building2 className="w-5 h-5"/> Manage Invoice Settings
          </button>
          <button onClick={() => navigate('/locations')} className="w-full text-left p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 font-bold bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200">
            <Database className="w-5 h-5"/> Warehouses & Branches
          </button>
          
          <div className="mt-8 p-6 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-100 pb-3">
              <Database className="w-4 h-4 text-blue-600"/> <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">System Diagnostics</span>
            </div>
            <div className="space-y-3 text-xs font-bold uppercase tracking-wider">
              <div className="flex justify-between items-center"><span className="text-slate-400">Status</span><span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black">Online</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400">Database</span><span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black">Connected</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400">Framework</span><span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black font-mono">v2.4.0-ENT</span></div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-20 text-center text-slate-400">Loading settings...</div>
          ) : (
            <form onSubmit={handleSave} className="flex-1 flex flex-col">
              <div className="p-10 flex-1 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {activeTab === 'general' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">General Configuration</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise Identity & Parameters</p>
                    </div>

                    {/* Shop Logo Branding (Direct Upload / URL Link) */}
                    <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-4 gap-4">
                        <div>
                          <p className="text-base font-black text-slate-800">Shop Logo Branding</p>
                          <p className="text-xs font-medium text-slate-500 mt-1">Configure your custom corporate branding logo.</p>
                        </div>
                        {isAdmin && (
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleLogoInputModeChange('upload')}
                              className={`px-4 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-all ${logoInputMode === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              Direct Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLogoInputModeChange('url')}
                              className={`px-4 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-all ${logoInputMode === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              Logo URL Link
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative w-24 h-24 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                          {formData.shopLogo ? (
                            <img src={formData.shopLogo} className="w-full h-full object-contain" alt="Shop Logo Preview" onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '';
                            }} />
                          ) : (
                            <div className="flex flex-col items-center justify-center opacity-30">
                              <Building2 className="w-8 h-8 text-slate-400" />
                              <span className="text-[8px] font-black uppercase mt-1">No Logo</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3 text-center sm:text-left flex-1 w-full">
                          {logoInputMode === 'upload' ? (
                            <>
                              <p className="text-xs font-medium text-slate-500">Upload a custom logo to white-label the login portal and side navigation. Recommended format: transparent PNG/SVG (max 1MB).</p>
                              {isAdmin && (
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                  <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer transition-colors">
                                    Upload Image
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                  </label>
                                  {formData.shopLogo && (
                                    <button type="button" onClick={handleRemoveLogo} className="px-4 py-2.5 border border-red-200 hover:border-red-600 text-red-500 hover:text-white hover:bg-red-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                                      Remove Logo
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-medium text-slate-500">Enter the direct URL link to your logo image hosted on the web (e.g., https://example.com/logo.png).</p>
                              {isAdmin ? (
                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                  <input
                                    type="url"
                                    placeholder="https://example.com/images/shop-logo.png"
                                    value={logoUrlInput}
                                    onChange={handleLogoUrlChange}
                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                  />
                                  {formData.shopLogo && (
                                    <button type="button" onClick={handleRemoveLogo} className="px-4 py-3 border border-red-200 hover:border-red-600 text-red-500 hover:text-white hover:bg-red-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                                      Clear Link
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-slate-700 truncate">{logoUrlInput || 'No URL specified'}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Company Name</label>
                        <input className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formData.companyName} onChange={e=>setFormData({...formData, companyName: e.target.value})} disabled={!isAdmin}/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Outlet Address</label>
                        <input className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} disabled={!isAdmin}/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Support Mobile Number</label>
                        <input className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formData.mobile} onChange={e=>setFormData({...formData, mobile: e.target.value})} disabled={!isAdmin}/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Corporate Email</label>
                        <input className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} disabled={!isAdmin}/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Base Currency</label>
                        <select className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer" value={formData.currency} onChange={e=>handleCurrencyChange(e.target.value)} disabled={!isAdmin}>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="LKR">LKR (Rs.)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Default Tax Rate (%)</label>
                        <input type="number" className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formData.taxRate} onChange={e=>setFormData({...formData, taxRate: parseFloat(e.target.value)})} disabled={!isAdmin}/>
                      </div>
                    </div>

                    {/* Daily Stock Update automation configuration card */}
                    <div className="mt-8 p-6 bg-slate-50/50 border border-slate-100 rounded-3xl space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-black text-slate-800">Daily Stock Reset Automation</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Automatically reset and update all items to a target stock level daily at a scheduled time.</p>
                        </div>
                        <input
                          type="checkbox"
                          className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={formData.dailyStockUpdateEnabled}
                          onChange={(e) => setFormData({ ...formData, dailyStockUpdateEnabled: e.target.checked })}
                          disabled={!isAdmin}
                        />
                      </div>

                      {formData.dailyStockUpdateEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Daily Target Stock Qty</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                              value={formData.dailyStockUpdateQty}
                              onChange={(e) => setFormData({ ...formData, dailyStockUpdateQty: parseInt(e.target.value) || 0 })}
                              disabled={!isAdmin}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Execution Time (Daily)</label>
                            <input
                              type="time"
                              className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                              value={formData.dailyStockUpdateTime}
                              onChange={(e) => setFormData({ ...formData, dailyStockUpdateTime: e.target.value })}
                              disabled={!isAdmin}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'display' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Visual Preferences</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Interface Styling & Motion</p>
                    </div>
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl space-y-4">
                        <div>
                          <p className="text-base font-black text-slate-800">Application Theme</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Select the global color palette and aesthetic mode.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${formData.theme === 'light' ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'bg-white/50 border-slate-200 hover:bg-white'}`}>
                            <span className="text-sm font-bold text-slate-800">Light Mode</span>
                            <input type="radio" name="theme" value="light" checked={formData.theme === 'light'} onChange={() => setFormData({...formData, theme: 'light'})} disabled={!isAdmin} className="text-blue-600 focus:ring-blue-500" />
                          </label>
                          <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${formData.theme === 'dark' ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/20 shadow-md text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-900'}`}>
                            <span className="text-sm font-bold">Dark Mode</span>
                            <input type="radio" name="theme" value="dark" checked={formData.theme === 'dark'} onChange={() => setFormData({...formData, theme: 'dark'})} disabled={!isAdmin} className="text-blue-600 focus:ring-blue-500" />
                          </label>
                          <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${formData.theme === 'blue' ? 'bg-blue-900 border-blue-400 ring-2 ring-blue-400/20 shadow-md text-white' : 'bg-blue-950 border-blue-900 text-blue-200 hover:bg-blue-900'}`}>
                            <span className="text-sm font-bold">Enterprise Blue</span>
                            <input type="radio" name="theme" value="blue" checked={formData.theme === 'blue'} onChange={() => setFormData({...formData, theme: 'blue'})} disabled={!isAdmin} className="text-blue-600 focus:ring-blue-500" />
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:border-blue-500/30 transition-all group">
                        <div>
                          <p className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">Glassmorphism UI</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Enable frosted glass effects and premium translucent panels.</p>
                        </div>
                        <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={formData.glassmorphism} onChange={()=>setFormData({...formData, glassmorphism: !formData.glassmorphism})} disabled={!isAdmin}/>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:border-blue-500/30 transition-all group">
                        <div>
                          <p className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">Interface Animations</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Enable smooth hardware-accelerated transitions and micro-animations.</p>
                        </div>
                        <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={formData.animations} onChange={()=>setFormData({...formData, animations: !formData.animations})} disabled={!isAdmin}/>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'invoice_settings' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Invoice & Stock Configuration</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Business Rules and Catalog preferences</p>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:border-blue-500/30 transition-all group">
                        <div>
                          <p className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">Enable Batch Numbers</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Use batch codes for precise inventory tracking and FIFO sales.</p>
                        </div>
                        <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={formData.useBatchNumbers} onChange={()=>setFormData({...formData, useBatchNumbers: !formData.useBatchNumbers})} disabled={!isAdmin}/>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:border-blue-500/30 transition-all group">
                        <div>
                          <p className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">Enable Expiration Dates</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Require batch expiry warnings and enable batch-expiry forecasts in reports.</p>
                        </div>
                        <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={formData.useExpirationDates} onChange={()=>setFormData({...formData, useExpirationDates: !formData.useExpirationDates})} disabled={!isAdmin}/>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:border-blue-500/30 transition-all group">
                        <div>
                          <p className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">Enable Cost Price & Profit Analytics</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Display and calculate margins, P&L reports, and vendor buying rates.</p>
                        </div>
                        <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={formData.useCostPrice} onChange={()=>setFormData({...formData, useCostPrice: !formData.useCostPrice})} disabled={!isAdmin}/>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <button type="button" onClick={handleTestPrint} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-xs uppercase tracking-widest cursor-pointer border border-slate-700">
                    <Printer className="w-4 h-4 text-blue-400" /> Hardware Test Print
                  </button>
                  <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 text-xs uppercase tracking-widest cursor-pointer">
                    <Save className="w-4 h-4" /> Save Settings
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
