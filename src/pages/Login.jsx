import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Lock, User, Loader2, ShieldCheck, Cpu, Database, Server } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const res = await login(formData.username, formData.password);
    setIsLoading(false);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden px-4 font-sans">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      
      <div className="w-full max-w-[440px] relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/40 overflow-hidden border border-white/20">
          
          <div className="p-10 text-center relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
            
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-900 text-white shadow-xl mb-6 transform hover:rotate-6 transition-transform">
               <img src={logo} className="w-12 h-12 object-contain" alt="Logo" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PrasaTek Inventory System</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mt-2">Powered by PrasaTek System Solutions</p>
          </div>

          <div className="px-10 pb-10">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl mb-8 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Access</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                    placeholder="Operator Username"
                    value={formData.username}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Protocol</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                    placeholder="Enter Access Key"
                    value={formData.password}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98] group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="uppercase tracking-widest text-[11px]">Validating Access...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 group-hover:animate-bounce" />
                      <span className="uppercase tracking-[0.2em] text-[11px]">Authorize Session</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
             <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
             </div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Core Secure v4.2.1</p>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 flex justify-center items-center gap-6 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all">
           <div className="flex items-center gap-2 text-white">
              <Database className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted</span>
           </div>
           <div className="flex items-center gap-2 text-white">
              <Server className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">System Login</span>
           </div>
           <div className="flex items-center gap-2 text-white">
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Optimized</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
