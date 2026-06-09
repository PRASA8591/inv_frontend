import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger' // danger, warning, info
  });

  const resolver = useRef(null);

  const confirm = (options = {}) => {
    setState({
      isOpen: true,
      title: options.title || 'Confirm Action',
      message: options.message || 'Are you sure you want to proceed?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'danger'
    });

    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  };

  const handleClose = (result) => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* High-Fidelity Reusable Confirmation Modal Backdrop */}
      {state.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-hidden">
          {/* Dark Glass Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" 
            onClick={() => handleClose(false)}
          />
          
          {/* Modal Card Container */}
          <div className="relative bg-white border border-slate-200 rounded-[32px] shadow-2xl shadow-slate-950/10 w-full max-w-md p-6 md:p-8 animate-scale-in overflow-hidden select-none">
            
            {/* Top graphic header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3.5 rounded-2xl border shadow-sm flex-shrink-0 ${
                state.type === 'danger' 
                  ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-rose-500/5' 
                  : 'bg-amber-50 border-amber-100 text-amber-600 shadow-amber-500/5'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div className="flex-1 min-w-0 mt-1">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{state.title}</h3>
                <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">{state.message}</p>
              </div>

              <button 
                onClick={() => handleClose(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Block */}
            <div className="flex flex-col sm:flex-row-reverse gap-3 border-t border-slate-100 pt-6">
              <button
                onClick={() => handleClose(true)}
                className={`px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg active:scale-98 transition-all select-none cursor-pointer flex-1 sm:flex-none text-white ${
                  state.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10 hover:shadow-rose-600/20'
                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10 hover:shadow-amber-500/20'
                }`}
              >
                {state.confirmText}
              </button>
              
              <button
                onClick={() => handleClose(false)}
                className="px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 active:scale-98 transition-all select-none cursor-pointer flex-1 sm:flex-none shadow-sm"
              >
                {state.cancelText}
              </button>
            </div>

          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be wrapped inside a ConfirmProvider');
  }
  return context;
};
