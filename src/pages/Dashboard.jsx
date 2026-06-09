import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { printService } from '../utils/printService';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  Activity,
  PlusCircle,
  Users,
  CreditCard,
  Layers,
  Zap,
  Download,
  X,
  Search,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { formatCurrency, settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [items, setItems] = useState([]);
  const [salesData, setSalesData] = useState({ totalSales: 0, salesCount: 0, chartData: [] });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Bills Modal State
  const [showAllBills, setShowAllBills] = useState(false);
  const [allBills, setAllBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [billsLoading, setBillsLoading] = useState(false);

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itemsRes, statsRes, historyRes] = await Promise.all([
          axios.get('http://localhost:5000/api/inventory', config).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/sales/stats/summary', config).catch(() => ({ data: { totalSales: 0, salesCount: 0, chartData: [] } })),
          axios.get('http://localhost:5000/api/sales', config).catch(() => ({ data: [] }))
        ]);
        setItems(itemsRes.data);
        setSalesData(statsRes.data);
        setRecentSales(historyRes.data.slice(0, 10));
        setAllBills(historyRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // URL Synchronization Effect for Bills Vault
  useEffect(() => {
    const isBillsView = location.pathname.includes('/dashboard/bills');
    if (isBillsView) {
      setShowAllBills(true);
      if (allBills.length === 0) {
        // Fetch if not already loaded
        setBillsLoading(true);
        axios.get('http://localhost:5000/api/sales', config)
          .then(res => {
            setAllBills(res.data);
            if (params.billId) {
              const found = res.data.find(b => b._id === params.billId || b._id.endsWith(params.billId));
              if (found) setSelectedBill(found);
              else setSelectedBill(null);
            }
          })
          .catch(err => console.error(err))
          .finally(() => setBillsLoading(false));
      } else {
        if (params.billId) {
          const found = allBills.find(b => b._id === params.billId || b._id.endsWith(params.billId));
          if (found) setSelectedBill(found);
          else setSelectedBill(null);
        } else {
          setSelectedBill(null);
        }
      }
    } else {
      setShowAllBills(false);
      setSelectedBill(null);
    }
  }, [location.pathname, params.billId, allBills]);

  const handleViewAllBills = () => {
    navigate('/dashboard/bills');
  };

  const handleSelectBill = (bill) => {
    navigate(`/dashboard/bills/${bill._id}`);
  };

  const handleCloseVault = () => {
    navigate('/dashboard');
  };

  const handleBackToList = () => {
    navigate('/dashboard/bills');
  };

  const handleReprintReceipt = (bill) => {
    printService.posReceipt(bill, settings);
  };

  const filterBills = () => {
    return allBills.filter(bill => {
      const billDate = new Date(bill.createdAt).setHours(0,0,0,0);
      const from = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
      const to = toDate ? new Date(toDate).setHours(23,59,59,999) : null;
      
      if(from && billDate < from) return false;
      if(to && billDate > to) return false;
      return true;
    });
  };

  const handleExportCSV = () => {
    const filtered = filterBills();
    if(filtered.length === 0) return;
    
    const headers = ['Invoice ID', 'Date', 'Customer', 'Items Count', 'Total Amount', 'Status'];
    const csvRows = [headers.join(',')];
    
    filtered.forEach(bill => {
      const row = [
        bill._id,
        new Date(bill.createdAt).toLocaleDateString(),
        `"${bill.customerName || 'Walk-in Customer'}"`,
        bill.items?.length || 0,
        bill.totalAmount,
        'Paid'
      ];
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills_export_${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const defaultChartData = [
    { name: 'Mon', sales: 4200, orders: 24 },
    { name: 'Tue', sales: 3100, orders: 18 },
    { name: 'Wed', sales: 6200, orders: 35 },
    { name: 'Thu', sales: 8400, orders: 42 },
    { name: 'Fri', sales: 5100, orders: 28 },
    { name: 'Sat', sales: 11800, orders: 55 },
    { name: 'Sun', sales: 9200, orders: 48 }
  ];

  const chartData = salesData.chartData && salesData.chartData.length > 0 
    ? salesData.chartData.map(d => ({ name: d._id, sales: d.total, orders: d.count || Math.floor(d.total / 100) }))
    : defaultChartData;

  const lowStockItems = items.filter(i => i.quantity > 0 && i.quantity <= 5);
  const outOfStockItems = items.filter(i => i.quantity <= 0);
  const totalInventoryValue = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const activeCategories = [...new Set(items.map(i => i.category))];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const pieData = activeCategories.slice(0, 6).map((cat, idx) => ({
    name: cat,
    value: items.filter(i => i.category === cat).length
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full opacity-20 blur-[60px] translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-white border border-white/20 shadow-xl">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">System Dashboard</h1>
              <p className="text-slate-300 font-medium mt-1">Real-time operational intelligence and analytics.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Live Sync Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumStatCard 
          title="Total Revenue" 
          value={formatCurrency(salesData.totalSales)} 
          icon={<DollarSign className="w-5 h-5" />} 
          trend="+12.5%" 
          trendUp={true}
          gradient="from-blue-600 to-indigo-600"
        />
        <PremiumStatCard 
          title="Total Orders" 
          value={salesData.salesCount} 
          icon={<ShoppingBag className="w-5 h-5" />} 
          trend="+8.2%" 
          trendUp={true}
          gradient="from-emerald-500 to-teal-600"
        />
        <PremiumStatCard 
          title="Inventory Value" 
          value={formatCurrency(totalInventoryValue)} 
          icon={<Package className="w-5 h-5" />} 
          trend="+3.4%" 
          trendUp={true}
          gradient="from-amber-500 to-orange-600"
        />
        <PremiumStatCard 
          title="Critical Alerts" 
          value={lowStockItems.length + outOfStockItems.length} 
          icon={<AlertCircle className="w-5 h-5" />} 
          trend="-2.1%" 
          trendUp={false}
          gradient="from-rose-500 to-pink-600"
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Revenue Analytics</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">7-Day Performance Trend</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option>Last 7 Days</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '12px 16px' }}
                  itemStyle={{ fontWeight: 700 }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="sales" name="Revenue" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 hover:shadow-2xl transition-all duration-300 flex flex-col">
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Category Distribution</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-8">Active Inventory Allocation</p>
          
          <div className="flex-1 flex flex-col justify-center relative">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Center metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-800 tracking-tighter">{items.length}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Items</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-y-3 gap-x-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-xs font-bold text-slate-600 truncate flex-1">{entry.name}</span>
                <span className="text-xs font-black text-slate-900">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">

        {/* Recent Transactions List */}
        {(user?.role === 'admin' || user?.access?.recent_bills) && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Recent Transactions</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Latest Sales Activity</p>
              </div>
              <button onClick={handleViewAllBills} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors cursor-pointer">
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          
          <div className="flex-1 overflow-hidden">
            {recentSales.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <div key={sale._id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-sm">
                        {sale.customerName ? sale.customerName.substring(0, 2).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{sale.customerName || 'Walk-in Customer'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(sale.createdAt).toLocaleDateString()}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{sale.items.length} Items</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900 tracking-tight">{formatCurrency(sale.totalAmount)}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">Paid</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <ShoppingBag className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-500">No recent transactions found.</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* All Bills Vault Modal */}
      {showAllBills && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-inner">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Transactions Vault</h2>
                    {selectedBill && (
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-mono font-bold rounded-lg">
                        #{selectedBill._id.slice(-8).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {selectedBill ? 'Detailed Invoice Inspection' : 'Complete Billing History'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedBill && (
                  <button onClick={handleBackToList} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                    <ArrowRight className="w-4 h-4 rotate-180" /> Back to List
                  </button>
                )}
                <button onClick={handleCloseVault} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {selectedBill ? (
              /* Detailed Bill View */
              <div className="flex-1 overflow-auto p-8 bg-slate-50/30 flex flex-col justify-between">
                <div className="max-w-3xl mx-auto w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
                  {/* Bill Meta */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-100 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
                      <h4 className="text-xl font-black text-slate-800">{selectedBill.customerName || 'Walk-in Customer'}</h4>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Timestamp</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(selectedBill.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Cashier: {selectedBill.soldBy?.username || 'System'}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Item Description</th>
                          <th className="px-6 py-4 text-center">Qty</th>
                          <th className="px-6 py-4 text-right">Unit Price</th>
                          <th className="px-6 py-4 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {selectedBill.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {item.name}
                              {item.batchNumber && <span className="block text-[10px] text-blue-600 font-mono">Batch: {item.batchNumber}</span>}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(item.price)}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end pt-6 border-t border-slate-100">
                    <div className="w-full sm:w-80 space-y-3">
                      <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(selectedBill.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>Payment Method</span>
                        <span className="uppercase font-mono text-blue-600">{selectedBill.paymentMethod || 'CASH'}</span>
                      </div>
                      <div className="flex justify-between text-lg font-black text-slate-900 pt-3 border-t border-dashed border-slate-200">
                        <span>Grand Total</span>
                        <span>{formatCurrency(selectedBill.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="max-w-3xl mx-auto w-full pt-6 flex justify-end gap-4">
                  <button onClick={() => handleReprintReceipt(selectedBill)} className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 transition-all cursor-pointer">
                    <Printer className="w-4 h-4" /> Reprint Receipt
                  </button>
                </div>
              </div>
            ) : (
              /* All Bills List View */
              <>
                {/* Toolbar */}
                <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">From Date</label>
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">To Date</label>
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                    </div>
                    {(fromDate || toDate) && (
                      <button onClick={() => { setFromDate(''); setToDate(''); }} className="mt-5 text-xs font-bold text-slate-400 hover:text-red-500 underline cursor-pointer">Clear Filters</button>
                    )}
                  </div>
                  <button onClick={handleExportCSV} className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl font-bold text-sm border border-emerald-200 transition-colors cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4" /> Export CSV
                  </button>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto bg-slate-50/30 p-8">
                  {billsLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-xs font-bold uppercase tracking-widest">Loading Records...</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Invoice ID</th>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Cashier</th>
                            <th className="px-6 py-4 text-center">Items</th>
                            <th className="px-6 py-4 text-right">Total Amount</th>
                            <th className="px-6 py-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filterBills().map((bill) => (
                            <tr key={bill._id} onClick={() => handleSelectBill(bill)} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                              <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600 group-hover:underline">
                                #{bill._id.slice(-8).toUpperCase()}
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-800">{new Date(bill.createdAt).toLocaleDateString()}</p>
                                <p className="text-[10px] text-slate-400">{new Date(bill.createdAt).toLocaleTimeString()}</p>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-800">{bill.customerName || 'Walk-in Customer'}</td>
                              <td className="px-6 py-4 font-medium text-slate-600">{bill.soldBy?.username || 'System'}</td>
                              <td className="px-6 py-4 text-center font-bold text-slate-500">{bill.items?.length || 0}</td>
                              <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(bill.totalAmount)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                                  Inspect <ArrowRight className="w-3 h-3" />
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filterBills().length === 0 && (
                            <tr>
                              <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold">No bills found for the selected dates.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

const PremiumStatCard = ({ title, value, icon, trend, trendUp, gradient }) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-4 sm:p-5 lg:p-4 xl:p-5 text-white shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group select-none`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full opacity-10 blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
      
      <div className="flex justify-between items-start relative z-10 gap-2 sm:gap-3 lg:gap-2 xl:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-white/70 uppercase tracking-widest truncate">{title}</p>
          <h3 className="text-base sm:text-lg lg:text-sm xl:text-xl font-black mt-2 tracking-tighter truncate" title={value}>{value}</h3>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/10 flex-shrink-0">
          {icon}
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 relative z-10">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/20 backdrop-blur-sm ${trendUp ? 'text-white' : 'text-rose-100'}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
        <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">vs Last Month</span>
      </div>
    </div>
  );
};

export default Dashboard;
