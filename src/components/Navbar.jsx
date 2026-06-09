import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Package, Settings } from 'lucide-react';

const Navbar = () => {
  const { logout, user } = useAuth();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 h-16 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary-700">
          <Package className="w-7 h-7" />
          <span className="font-bold text-xl tracking-tight text-slate-900">InvManager</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-sm font-medium text-slate-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{user?.username}</span>
            <span className="text-xs text-slate-400 ml-1 capitalize">({user?.role})</span>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
