import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  Tag, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Truck,
  Briefcase,
  PlusCircle,
  Activity,
  MapPin
} from 'lucide-react';
import systemLogo from '../assets/logo.png';

const Layout = ({ children }) => {
  const { logout, user, setUser } = useAuth();
  const { confirm } = useConfirm();
  const { settings } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 5000); // Check license expiry every 5 seconds
    return () => clearInterval(timer);
  }, []);
  const location = useLocation();



  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  const handleSwitchLocation = async (warehouseId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/auth/switch-location', { warehouseId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      sessionStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setShowLocationMenu(false);
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch location", err);
    }
  };

  const startProgressUpdate = async () => {
    setShowUpdateModal(true);
    setUpdateProgress(0);

    try {
      const token = sessionStorage.getItem('token');
      await axios.post('http://localhost:5000/api/settings/trigger-stock-update', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Failed to trigger backend stock update", e);
    }

    const duration = 5000;
    const intervalTime = 50;
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const percent = Math.min(Math.floor((currentStep / totalSteps) * 100), 100);
      setUpdateProgress(percent);

      if (currentStep >= totalSteps) {
        clearInterval(progressInterval);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    }, intervalTime);
  };

  useEffect(() => {
    if (!settings?.dailyStockUpdateEnabled || !settings?.dailyStockUpdateTime) return;

    const intervalId = setInterval(() => {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMin = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMin}`;

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${date}`;

      if (currentTimeStr === settings.dailyStockUpdateTime) {
        const lastTrigger = sessionStorage.getItem('lastStockUpdateTriggerDate');
        if (lastTrigger !== todayStr) {
          sessionStorage.setItem('lastStockUpdateTriggerDate', todayStr);
          startProgressUpdate();
        }
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [settings]);

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to securely sign out of the system?',
      confirmText: 'Sign Out',
      type: 'danger'
    });
    if (isConfirmed) {
      logout();
    }
  };

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, accessKey: 'dashboard' },
    { path: '/items', name: 'Items Management', icon: <Package className="w-5 h-5" />, accessKey: 'items' },
    { path: '/stock', name: 'Stock Management', icon: <TrendingUp className="w-5 h-5" />, accessKey: 'stock' },
    { path: '/stock/direct', name: 'Direct Stock Add', icon: <PlusCircle className="w-5 h-5" />, accessKey: 'direct_stock' },
    { path: '/pos', name: 'POS Terminal', icon: <ShoppingCart className="w-5 h-5" />, accessKey: 'pos' },
    { path: '/price', name: 'Price Management', icon: <Tag className="w-5 h-5" />, accessKey: 'price' },
    { path: '/crm', name: 'Customers (CRM)', icon: <Users className="w-5 h-5" />, accessKey: 'crm' },
    { path: '/supply', name: 'Supply Chain', icon: <Truck className="w-5 h-5" />, accessKey: 'supply' },
    { path: '/invoices', name: 'Invoices', icon: <Briefcase className="w-5 h-5" />, accessKey: 'invoices' },
    { path: '/users', name: 'System Users', icon: <Users className="w-5 h-5" />, accessKey: 'users' },
    { path: '/reports', name: 'Reports', icon: <BarChart3 className="w-5 h-5" />, accessKey: 'reports' },
    { path: '/locations', name: 'Locations & Branches', icon: <MapPin className="w-5 h-5" />, accessKey: 'settings' },
    { path: '/settings', name: 'Settings', icon: <Settings className="w-5 h-5" />, accessKey: 'settings' },
    { path: '/activation', name: 'System Activation', icon: <Activity className="w-5 h-5" />, accessKey: 'activation' }
  ];

  const getPageTitle = () => {
    const current = menuItems.find(item => {
      if (item.path === '/') return location.pathname === '/';
      if (item.path === '/stock') return location.pathname === '/stock' || location.pathname.startsWith('/stock/edit');
      return location.pathname.startsWith(item.path);
    });
    return current ? current.name : 'Dashboard';
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!user) return false;
    if (item.path === '/activation') return user.role === 'admin';
    if (user.role === 'admin') return true;
    return user.access && user.access[item.accessKey] !== 'none' && user.access[item.accessKey] !== false;
  });

  const isDark = settings?.theme === 'dark';
  const isBlue = settings?.theme === 'blue';
  const isLight = !isDark && !isBlue;

  // Active license verification
  const isSystemActive = (() => {
    if (!settings || settings.activationStatus === undefined) return true; // keep active while loading to avoid flicker
    if (settings.activationStatus !== 'active') return false;
    if (settings.activationExpiryDate) {
      const expiry = new Date(settings.activationExpiryDate);
      if (currentDate > expiry) return false;
    }
    return true;
  })();

  const isLocked = user && user.role !== 'admin' && !isSystemActive;

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full text-center relative overflow-hidden font-sans">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>
          
          <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
            <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>

          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Activation Required</h3>
          <p className="text-sm font-bold text-rose-600 uppercase tracking-widest mt-1">Access Suspended</p>
          
          <p className="text-xs text-slate-500 mt-4 leading-relaxed font-bold">
            This system is not activated or your subscription has expired. Please contact your system administrator (<span className="text-slate-700">PrasaTek System Solutions</span>) to activate the system.
          </p>

          <button 
            onClick={logout}
            className="mt-8 w-full bg-slate-900 hover:bg-rose-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" /> Sign Out of System
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      
      <div className={`flex flex-1 overflow-hidden font-sans ${isDark ? 'bg-slate-950 text-slate-100 dark-theme' : isBlue ? 'bg-blue-950 text-blue-100 blue-theme' : 'bg-slate-100 text-slate-800 light-theme'} ${settings?.glassmorphism ? 'glassmorphism-enabled' : ''} ${settings?.animations ? 'animations-enabled' : ''}`}>
        
      {/* Sidebar */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } fixed inset-y-0 left-0 z-50 flex flex-col ${isDark ? 'bg-slate-900 border-r border-slate-800' : isBlue ? 'bg-blue-900 border-r border-blue-800' : 'bg-slate-800'} text-slate-300 transition-all duration-300 md:relative ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between px-6 h-16 ${isDark ? 'bg-slate-950' : isBlue ? 'bg-blue-950' : 'bg-slate-900'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <img src={systemLogo} className="w-8 h-8 object-contain rounded flex-shrink-0" alt="Logo" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[13px] font-black text-white tracking-tight">PrasaTek Inventory</span>
                <span className="text-[11px] font-bold text-slate-300 mt-0.5">System</span>
              </div>
            </div>
          )}
          {isCollapsed && <img src={systemLogo} className="w-8 h-8 object-contain mx-auto rounded" alt="Logo" />}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden md:block text-slate-400 hover:text-white"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => {
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : (item.path === '/stock'
                  ? (location.pathname === '/stock' || location.pathname.startsWith('/stock/edit'))
                  : location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex items-center rounded-md px-3 py-2.5 transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : isDark ? 'hover:bg-slate-800 hover:text-white' : isBlue ? 'hover:bg-blue-800 hover:text-white' : 'hover:bg-slate-700 hover:text-white'}
                `}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="ml-3 text-sm font-medium">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Bottom */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-950' : isBlue ? 'border-blue-800 bg-blue-950' : 'border-slate-700 bg-slate-900'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.username}</p>
                <p className="text-[10px] text-slate-400 uppercase">{user?.role}</p>
              </div>
            )}
            <button onClick={handleLogout} className="text-slate-400 hover:text-white p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar */}
        <header className={`h-16 ${isDark ? 'bg-slate-900 border-b border-slate-800 text-white' : isBlue ? 'bg-blue-900 border-b border-blue-800 text-white' : 'bg-white border-b border-slate-200 text-slate-800'} flex items-center justify-between px-6 z-30 transition-colors`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className={`p-2 ${isLight ? 'text-slate-600' : 'text-slate-300'} md:hidden`}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Location Switcher */}
            {user && user.allowedWarehouses && user.allowedWarehouses.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowLocationMenu(!showLocationMenu)}
                  className={`flex items-center gap-2 px-3 py-2 ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-slate-200'} rounded-xl transition-all border border-slate-200/50 shadow-sm font-bold text-xs`}
                >
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="max-w-[120px] truncate">{user.currentWarehouse?.name || 'Main HQ'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showLocationMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLocationMenu(false)}></div>
                    <div className={`absolute right-0 mt-2 w-56 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : isBlue ? 'bg-blue-900 border-blue-800 text-white' : 'bg-white border-slate-200 text-slate-800'} border shadow-xl rounded-2xl py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
                      <div className={`px-4 py-2 border-b ${isLight ? 'border-slate-100' : 'border-white/10'} mb-1`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Switch Location</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {user.allowedWarehouses.map((wh) => {
                          const isActive = String(wh._id || wh) === String(user.currentWarehouse?._id || user.currentWarehouse);
                          return (
                            <button
                              key={wh._id}
                              onClick={() => handleSwitchLocation(wh._id)}
                              className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between font-bold transition-colors ${
                                isActive 
                                  ? 'bg-blue-600 text-white' 
                                  : isLight ? 'hover:bg-slate-50 text-slate-700' : 'hover:bg-white/10 text-slate-200'
                              }`}
                            >
                              <span>{wh.name} ({wh.code})</span>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button className={`relative p-2 ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10'} rounded-full transition-colors`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-600 rounded-full"></span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-2 p-1 pl-2 ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'} rounded-md transition-colors`}
              >
                <div className="hidden sm:block text-right mr-1">
                  <p className="text-xs font-bold leading-none">{user?.username}</p>
                  <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-300'} mt-1 uppercase`}>{user?.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
                  {user?.username?.substring(0, 2).toUpperCase()}
                </div>
                <ChevronDown className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-300'}`} />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                  <div className={`absolute right-0 mt-2 w-48 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : isBlue ? 'bg-blue-900 border-blue-800 text-white' : 'bg-white border-slate-200 text-slate-800'} border shadow-xl rounded-2xl py-2 z-50 overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
                      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Logged in as</p>
                      <p className="text-sm font-bold truncate">{user?.username}</p>
                    </div>
                    <NavLink to="/settings" onClick={() => setShowProfileMenu(false)} className={`block px-4 py-2.5 text-sm ${isLight ? 'hover:bg-slate-50 text-slate-700' : 'hover:bg-white/10 text-slate-200'}`}>Profile Settings</NavLink>
                    <button 
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className={`block w-full text-left px-4 py-2.5 text-sm text-red-500 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/10 font-bold'}`}
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className={`flex-1 overflow-y-auto p-6 ${isDark ? 'bg-slate-950' : isBlue ? 'bg-blue-950' : 'bg-slate-100'} transition-colors`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {showUpdateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${updateProgress}%` }}
              ></div>
            </div>
            
            <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
              <Activity className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Daily Stock Sync</h3>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Automatic Reset In Progress</p>
            
            <p className="text-xs text-slate-400 mt-4 max-w-sm mx-auto">
              Updating all system inventory stock levels to the daily target limit of <span className="font-bold text-slate-700">{settings?.dailyStockUpdateQty} qty</span>. Please wait...
            </p>

            <div className="mt-8 relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2.5 uppercase rounded-full text-blue-600 bg-blue-50 font-black tracking-wider">
                    Task Status
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-600">
                    {updateProgress}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-100">
                <div
                  style={{ width: `${updateProgress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-75"
                ></div>
              </div>
            </div>
            
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8">System will restart automatically upon completion</p>
          </div>
        </div>
      )}


    </div>
    </div>
  );
};

export default Layout;
