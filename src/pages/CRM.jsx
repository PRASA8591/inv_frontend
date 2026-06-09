import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Trash2, 
  Edit3, 
  X, 
  Filter,
  CheckCircle2,
  Award,
  Wallet,
  History,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  Globe
} from 'lucide-react';


const CRM = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { formatCurrency, settings } = useSettings();
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin' && !user?.access?.crm_edit;
  
  const [searchParams, setSearchParams] = useSearchParams();
  const customerIdParam = searchParams.get('id');
  const activeTab = searchParams.get('tab') || 'customers';
  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // name, balance, loyalty
  const [showOnlyDebt, setShowOnlyDebt] = useState(false);
  const [activeDetailCustomer, setActiveDetailCustomer] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    title: 'Mr.',
    name: '',
    phone: '',
    email: '',
    address: '',
    category: 'Retail',
    creditLimit: 0,
    notes: '',
    type: 'Customer'
  });

  // Wallet deposit states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDetails, setDepositDetails] = useState('');
  const [loadingDeposit, setLoadingDeposit] = useState(false);

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositAmount || isNaN(parseFloat(depositAmount)) || parseFloat(depositAmount) <= 0) {
      return toast.error("Please enter a valid deposit amount.");
    }
    setLoadingDeposit(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/customers/${activeDetailCustomer._id}/deposit`, {
        amount: parseFloat(depositAmount),
        details: depositDetails
      }, config);
      toast.success("Deposit processed successfully.");
      
      // Update details view instantly
      setActiveDetailCustomer(res.data);
      // Update local customers list
      setCustomers(customers.map(c => c._id === res.data._id ? res.data : c));
      
      setDepositAmount('');
      setDepositDetails('');
      setShowDepositModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Prepaid deposit failed.");
    } finally {
      setLoadingDeposit(false);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const [custRes, invRes, poRes, grnRes] = await Promise.all([
        axios.get('http://localhost:5000/api/customers', config),
        axios.get('http://localhost:5000/api/invoices', config).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/supply/po', config).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/supply/grn', config).catch(() => ({ data: [] }))
      ]);
      setCustomers(custRes.data);
      setInvoices(invRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setGrns(grnRes.data || []);
    } catch (err) {
      toast.error('Customer data synchronization failure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customerIdParam && customers.length > 0) {
      const match = customers.find(c => c._id === customerIdParam);
      if (match) {
        setActiveDetailCustomer(match);
      } else {
        setActiveDetailCustomer(null);
      }
    } else if (!customerIdParam) {
      setActiveDetailCustomer(null);
    }
  }, [customerIdParam, customers]);

  const openModal = (customer = null) => {
    const currentTabType = activeTab === 'suppliers' ? 'Supplier' : activeTab === 'sellers' ? 'Seller' : 'Customer';
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        title: customer.title || 'Mr.',
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        category: customer.category || 'Retail',
        creditLimit: customer.creditLimit || 0,
        notes: customer.notes || '',
        type: customer.type || 'Customer'
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        title: 'Mr.',
        name: '',
        phone: '',
        email: '',
        address: '',
        category: 'Retail',
        creditLimit: 0,
        notes: '',
        type: currentTabType
      });
    }
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await axios.put(`http://localhost:5000/api/customers/${editingCustomer._id}`, formData, config);
        toast.success('Entity updated.');
      } else {
        await axios.post('http://localhost:5000/api/customers', formData, config);
        toast.success('Entity registered.');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error('Transaction failed.');
    }
  };

  const handleDelete = async (customer) => {
    const isConfirmed = await confirm({
      title: 'Purge Entity Record?',
      message: `Are you sure you want to remove ${customer.name}? This action is irreversible.`,
      confirmText: 'Purge Record',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/customers/${customer._id}`, config);
        toast.success('Record purged.');
        fetchCustomers();
      } catch (err) {
        toast.error('Purge operation failed.');
      }
    }
  };

  const filteredCustomers = customers
    .filter(c => {
      const cType = c.type || 'Customer';
      if (activeTab === 'customers' && cType !== 'Customer') return false;
      if (activeTab === 'suppliers' && cType !== 'Supplier') return false;
      if (activeTab === 'sellers' && cType !== 'Seller') return false;

      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.phone.includes(searchTerm) || 
                            (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = activeTab !== 'customers' || categoryFilter === 'All' || c.category === categoryFilter;
      const matchesDebt = !showOnlyDebt || (c.currentBalance > 0);
      return matchesSearch && matchesFilter && matchesDebt;
    })
    .sort((a, b) => {
      if (sortBy === 'balance') return (b.currentBalance || 0) - (a.currentBalance || 0);
      if (sortBy === 'loyalty') return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      return a.name.localeCompare(b.name);
    });

  const totalReceivable = customers.filter(c => !c.type || c.type === 'Customer').reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  const vipCount = customers.filter(c => (!c.type || c.type === 'Customer') && c.category === 'VIP').length;

  const getMetrics = () => {
    if (activeTab === 'suppliers') {
      const activeSuppliers = customers.filter(c => c.type === 'Supplier').length;
      return [
        { label: "Active Suppliers", value: activeSuppliers, icon: <Briefcase className="w-6 h-6" />, color: "blue", sub: "Global vendor directory" },
        { label: "Location Reach", value: "All Locations", icon: <Globe className="w-6 h-6" />, color: "rose", sub: "Shared global scope" },
        { label: "PO / GRN Support", value: "Enabled", icon: <ShieldCheck className="w-6 h-6" />, color: "amber", sub: "Procurement integration" }
      ];
    }
    if (activeTab === 'sellers') {
      const activeSellers = customers.filter(c => c.type === 'Seller').length;
      return [
        { label: "Registered Sellers", value: activeSellers, icon: <Users className="w-6 h-6" />, color: "blue", sub: "B2B client list" },
        { label: "Location Reach", value: "All Locations", icon: <Globe className="w-6 h-6" />, color: "rose", sub: "Shared global scope" },
        { label: "Commercial Invoice", value: "Enabled", icon: <CheckCircle2 className="w-6 h-6" />, color: "amber", sub: "Accounts receivable" }
      ];
    }
    // Default: customers
    const activeCustomers = customers.filter(c => !c.type || c.type === 'Customer').length;
    return [
      { label: "Active Customers", value: activeCustomers, icon: <Users className="w-6 h-6" />, color: "blue", sub: "Local to this location" },
      { label: "Gross Receivables", value: formatCurrency(totalReceivable), icon: <Wallet className="w-6 h-6" />, color: "rose", sub: "Outstanding credit" },
      { label: "Premium Class (VIP)", value: vipCount, icon: <Award className="w-6 h-6" />, color: "amber", sub: "Loyalty segment" }
    ];
  };

  const metrics = getMetrics();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Advanced Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Relations (CRM)</h1>
            <p className="text-sm text-slate-500 font-medium">Manage entity relationships, credit exposures, and lifecycle.</p>
          </div>
        </div>
        
        {!readOnly && (
          <button 
            onClick={() => openModal()} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <UserPlus className="w-4 h-4" /> Register New Entity
          </button>
        )}
      </div>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {metrics.map((m, idx) => (
          <MetricCard key={idx} label={m.label} value={m.value} icon={m.icon} color={m.color} sub={m.sub} />
        ))}
      </div>

      {/* Customers List */ }
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Navigation Tabs (Supply Chain Style) */}
        <div className="flex border-b border-slate-200 space-x-10 px-6 pt-6 bg-slate-50/30">
          <TabItem label="Customers" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} count={customers.filter(c => !c.type || c.type === 'Customer').length} />
          <TabItem label="Suppliers" active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} count={customers.filter(c => c.type === 'Supplier').length} />
          <TabItem label="Sellers" active={activeTab === 'sellers'} onClick={() => setActiveTab('sellers')} count={customers.filter(c => c.type === 'Seller').length} />
        </div>

        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="relative w-full lg:w-[450px] group">
              <Search className="absolute left-4 inset-y-0 my-auto h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Query by Identity, Phone, or Electronic Mail..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {activeTab === 'customers' && (
              <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start lg:self-auto">
                {['All', 'Retail', 'Wholesale', 'VIP'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      categoryFilter === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200/50">
            <div className="flex items-center gap-4">
              {activeTab === 'customers' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort By:</span>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)} 
                    className="p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-600 cursor-pointer"
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="balance">Highest Receivable Balance</option>
                    <option value="loyalty">Highest Loyalty Points</option>
                  </select>
                </div>
              )}

              {activeTab === 'customers' && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showOnlyDebt} 
                    onChange={(e) => setShowOnlyDebt(e.target.checked)} 
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Show Only Credit Debtors</span>
                </label>
              )}
            </div>
            
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Filtered: <span className="text-blue-600">{filteredCustomers.length} Entities</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Entity Information</th>
                {activeTab === 'customers' ? (
                  <>
                    <th className="px-6 py-5">Category</th>
                    <th className="px-6 py-5">Credit Exposure</th>
                    <th className="px-6 py-5">Loyalty Yield</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-5">Electronic Mail</th>
                    <th className="px-6 py-5">Physical Address</th>
                    <th className="px-6 py-5">Status Scope</th>
                  </>
                )}
                <th className="px-8 py-5 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map((client) => (
                <tr key={client._id} onClick={() => setSearchParams({ tab: activeTab, id: client._id })} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                          {client.name.substring(0, 2)}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">{client.title ? `${client.title} ` : ''}{client.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {client.phone}</p>
                       </div>
                    </div>
                  </td>
                  {activeTab === 'customers' ? (
                    <>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest ${
                          client.category === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                          client.category === 'Wholesale' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {client.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className={`text-sm font-black ${client.currentBalance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatCurrency(client.currentBalance)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Threshold: {formatCurrency(client.creditLimit)}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                           <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                           <span className="text-sm font-black text-slate-900">{client.loyaltyPoints}</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Yield Units</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-5 text-sm text-slate-600 font-medium">
                        {client.email || 'N/A'}
                      </td>
                      <td className="px-6 py-5 text-xs text-slate-500 max-w-xs truncate" title={client.address}>
                        {client.address || 'No physical address recorded.'}
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                          Global (All Locations)
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-8 py-5 text-right">
                    {!readOnly && (
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); openModal(client); }} className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(client); }} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && !loading && (
                <tr>
                   <td colSpan={5} className="py-32 text-center">
                      <div className="flex flex-col items-center opacity-20">
                         <Users className="w-20 h-20 text-slate-300" />
                         <p className="mt-4 font-black uppercase tracking-[0.3em] text-xs">Entity Directory Null</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="flex items-center gap-4 relative z-10">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                    {editingCustomer ? <Edit3 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tight">{editingCustomer ? 'Update Entity Context' : 'New Entity Registration'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Authorized Directory Entry</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all relative z-10"><X className="w-6 h-6"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="label-style">Entity Type <span className="text-red-500">*</span></label>
                  <select name="type" className="input-field cursor-pointer" value={formData.type} onChange={handleInputChange} required>
                    <option value="Customer">Customer (POS Bills - Local to Created Location)</option>
                    <option value="Supplier">Supplier (PO / GRN / Returns - Global to All Locations)</option>
                    <option value="Seller">Seller (Invoices - Global to All Locations)</option>
                  </select>
                </div>

                <div>
                  <label className="label-style">Identity Name <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select name="title" className="input-field cursor-pointer shrink-0" style={{ width: '110px' }} value={formData.title} onChange={handleInputChange}>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Rev.">Rev.</option>
                      <option value="Prof.">Prof.</option>
                      <option value="">None</option>
                    </select>
                    <input name="name" className="input-field flex-1 font-bold text-slate-800" style={{ minWidth: '0' }} value={formData.name} onChange={handleInputChange} required placeholder="Enter full identity name or company name..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="label-style">Comms Phone <span className="text-red-500">*</span></label>
                    <input name="phone" className="input-field" value={formData.phone} onChange={handleInputChange} required placeholder="Enter contact phone number..." />
                  </div>
                  <div>
                    <label className="label-style">Electronic Mail</label>
                    <input name="email" type="email" className="input-field" value={formData.email} onChange={handleInputChange} placeholder="client@example.com" />
                  </div>
                </div>

                <div>
                  <label className="label-style">Physical Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input name="address" className="input-field pl-11" value={formData.address} onChange={handleInputChange} placeholder="Suite, Street, City, State..." />
                  </div>
                </div>

                {formData.type === 'Customer' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="label-style">Category</label>
                      <select name="category" className="input-field cursor-pointer" value={formData.category} onChange={handleInputChange}>
                        <option value="Retail">Retail Client</option>
                        <option value="Wholesale">Wholesale Partner</option>
                        <option value="VIP">Premium (VIP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-style text-rose-500 font-bold">Credit Exposure Limit</label>
                      <div className="relative">
                        <span className="absolute left-4 inset-y-0 flex items-center font-bold text-slate-400">
                          {settings.currencySymbol || 'Rs.'}
                        </span>
                        <input name="creditLimit" type="number" className="input-field pl-11 font-bold text-slate-800" value={formData.creditLimit} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label-style">Entity Documentation / Notes</label>
                  <textarea name="notes" rows="3" className="input-field resize-none" value={formData.notes} onChange={handleInputChange} placeholder="Specify any dynamic terms, preferences, or credit histories..."></textarea>
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-400">
                   <ShieldCheck className="w-5 h-5 text-emerald-500" />
                   <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">Identity Verified<br/>GDPR Compliant</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Discard</button>
                  <button type="submit" className="btn-primary">Save Entity</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Deposit Funds Modal */}
      {showDepositModal && activeDetailCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[24px] shadow-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Load Prepaid Wallet</h3>
                <p className="text-xs text-slate-400">{activeDetailCustomer.name}</p>
              </div>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleDepositSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Deposit Amount</label>
                <div className="relative">
                  <span className="absolute left-4 inset-y-0 flex items-center font-bold text-slate-400">
                    {settings.currencySymbol || 'Rs.'}
                  </span>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)} 
                    placeholder="0.00"
                    className="w-full px-4 py-3 pl-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Transaction Details</label>
                <input 
                  type="text" 
                  value={depositDetails} 
                  onChange={e => setDepositDetails(e.target.value)} 
                  placeholder="e.g. Cash load, Bank transfer"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <button 
                type="submit" 
                disabled={loadingDeposit}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingDeposit ? 'Processing...' : 'Load Wallet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer 360° Profile Drawer */}
      {activeDetailCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0 cursor-default" onClick={() => setSearchParams({ tab: activeTab })}></div>

          {/* Drawer Content */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
            
            {/* Header */}
            <div className="p-8 bg-slate-900 text-white flex justify-between items-start relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <div className="flex gap-5 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg uppercase shrink-0">
                  {activeDetailCustomer.name.substring(0, 2)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-black tracking-tight">
                      {activeDetailCustomer.title ? `${activeDetailCustomer.title} ` : ''}{activeDetailCustomer.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                      activeDetailCustomer.type === 'Supplier' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                      activeDetailCustomer.type === 'Seller' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                      activeDetailCustomer.category === 'VIP' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                      activeDetailCustomer.category === 'Wholesale' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 
                      'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {activeDetailCustomer.type || activeDetailCustomer.category || 'Customer'}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400 font-bold mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-blue-400" /> {activeDetailCustomer.phone}</span>
                    {activeDetailCustomer.email && (
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-blue-400" /> {activeDetailCustomer.email}</span>
                    )}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSearchParams({ tab: activeTab })} 
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all relative z-10 border border-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              {/* Financial Status Summary */}
              {(!activeDetailCustomer.type || activeDetailCustomer.type === 'Customer' || activeDetailCustomer.type === 'Seller') && (
                <div className="grid grid-cols-2 gap-6">
                  
                  {/* Receivable Exposure */}
                  <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Balance Status</span>
                        <Wallet className="w-4 h-4 text-rose-500" />
                      </div>
                      <h4 className={`text-lg font-black ${activeDetailCustomer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {activeDetailCustomer.currentBalance > 0 
                          ? `Owes: ${formatCurrency(activeDetailCustomer.currentBalance)}` 
                          : activeDetailCustomer.currentBalance < 0 
                            ? `Wallet: ${formatCurrency(Math.abs(activeDetailCustomer.currentBalance))}` 
                            : `Wallet: ${formatCurrency(0)}`}
                      </h4>
                      {activeDetailCustomer.type !== 'Seller' && (
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Limit: {formatCurrency(activeDetailCustomer.creditLimit)}</p>
                      )}
                    </div>
                    {(!activeDetailCustomer.type || activeDetailCustomer.type === 'Customer') && !readOnly && (
                      <button 
                        type="button"
                        onClick={() => setShowDepositModal(true)} 
                        className="w-full py-2 bg-blue-50 border border-dashed border-blue-200 text-blue-700 hover:bg-blue-100/70 font-black rounded-xl text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer mt-2"
                      >
                        Load Wallet Funds
                      </button>
                    )}
                  </div>

                  {/* Loyalty Program */}
                  {(!activeDetailCustomer.type || activeDetailCustomer.type === 'Customer') && (
                    <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loyalty Tier & Yield</span>
                        <Award className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900">
                          {activeDetailCustomer.loyaltyPoints} pts
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                            activeDetailCustomer.loyaltyTier === 'Gold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            activeDetailCustomer.loyaltyTier === 'Silver' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                            'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            {activeDetailCustomer.loyaltyTier || 'Bronze'}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            ({activeDetailCustomer.loyaltyTier === 'Gold' ? '2.0x pts' : activeDetailCustomer.loyaltyTier === 'Silver' ? '1.5x pts' : '1.0x pts'})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest pt-2 border-t border-slate-100">
                        <TrendingUp className="w-3.5 h-3.5" /> High-frequency purchaser
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Physical Address */}
              {activeDetailCustomer.address && (
                <div className="p-5 border border-slate-200/80 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registered physical site</span>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    {activeDetailCustomer.address}
                  </p>
                </div>
              )}

              {/* Notes */}
              {activeDetailCustomer.notes && (
                <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/30 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Internal entity files & documentation</span>
                  <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{activeDetailCustomer.notes}</p>
                </div>
              )}

              {/* Wallet Transactions Ledger */}
              {(!activeDetailCustomer.type || activeDetailCustomer.type === 'Customer') && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Wallet Transaction Log</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                      {(activeDetailCustomer.walletTransactions || []).length} Transactions
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(activeDetailCustomer.walletTransactions || []).slice().reverse().map((tx, idx) => (
                      <div key={idx} className="p-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-white flex items-center justify-between gap-4 transition-all hover:shadow-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${
                              tx.type === 'deposit' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              tx.type === 'payment' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              'bg-slate-50 text-slate-500 border border-slate-200'
                            }`}>
                              {tx.type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">{tx.details || 'N/A'}</span>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">
                            {new Date(tx.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-sm font-black ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                    
                    {(activeDetailCustomer.walletTransactions || []).length === 0 && (
                      <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                        <History className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">No wallet transactions logged.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invoices Ledger */}
              {(!activeDetailCustomer.type || activeDetailCustomer.type === 'Customer' || activeDetailCustomer.type === 'Seller') && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Account Billing Ledger</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                      {invoices.filter(inv => inv.customerDetails?.name === activeDetailCustomer.name).length} Invoices
                    </span>
                  </div>

                  <div className="space-y-3">
                    {invoices
                      .filter(inv => inv.customerDetails?.name === activeDetailCustomer.name)
                      .map(inv => (
                        <div key={inv._id} className="p-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-white flex items-center justify-between gap-4 transition-all hover:shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 font-mono">{inv.invoiceNumber}</span>
                              <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${
                                inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                inv.status === 'completed' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                {inv.status}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Date: {new Date(inv.invoiceDate).toLocaleDateString()} | Terms: {inv.paymentTerms}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-slate-900">{formatCurrency(inv.grandTotal)}</span>
                            <button 
                              onClick={() => {
                                printService.a4Document({
                                  title: 'Invoice', docNumber: inv.invoiceNumber, date: new Date(inv.invoiceDate).toLocaleDateString(),
                                  partyLabel: 'BILL TO', partyDetails: { name: inv.customerDetails?.name, email: inv.customerDetails?.email, phone: inv.customerDetails?.phone },
                                  items: inv.items.map(i => ({
                                    name: i.name,
                                    qty: i.quantity,
                                    price: i.costPrice || i.price,
                                    tax: i.taxRate,
                                    total: (i.quantity * (i.costPrice || i.price)) * (1 + (i.taxRate || 0) / 100),
                                    batch: i.batchNumber,
                                    expiry: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : '',
                                    costPrice: i.costPrice
                                  })),
                                  summaryFields: [{ label: 'Subtotal', value: inv.subtotal }, { label: 'Tax', value: inv.taxTotal }, { label: 'TOTAL', value: inv.grandTotal, isGrand: true }],
                                  badge: inv.status.toUpperCase(),
                                  settings
                                });
                              }}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 border border-transparent hover:border-slate-200 transition-all active:scale-95"
                              title="Spool Print Document"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    
                    {invoices.filter(inv => inv.customerDetails?.name === activeDetailCustomer.name).length === 0 && (
                      <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                        <History className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Zero commercial billing history recorded.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase Orders and GRNs - Only for Suppliers */}
              {activeDetailCustomer.type === 'Supplier' && (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Purchase Orders</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                        {purchaseOrders.filter(po => po.supplier === activeDetailCustomer.name).length} POs
                      </span>
                    </div>
                    <div className="space-y-3">
                      {purchaseOrders.filter(po => po.supplier === activeDetailCustomer.name).map(po => (
                        <div key={po._id} className="p-4 border border-slate-100 rounded-xl bg-white flex items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-black text-slate-800 font-mono">{po.poNumber}</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Date: {new Date(po.createdAt).toLocaleDateString()} | Status: {po.status}
                            </p>
                          </div>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(po.totalAmount)}</span>
                        </div>
                      ))}
                      {purchaseOrders.filter(po => po.supplier === activeDetailCustomer.name).length === 0 && (
                        <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                          <History className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">No purchase orders found.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Goods Received Notes (GRN)</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                        {grns.filter(g => g.supplier === activeDetailCustomer.name).length} GRNs
                      </span>
                    </div>
                    <div className="space-y-3">
                      {grns.filter(g => g.supplier === activeDetailCustomer.name).map(g => (
                        <div key={g._id} className="p-4 border border-slate-100 rounded-xl bg-white flex items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-black text-slate-800 font-mono">{g.grnNumber}</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Date: {new Date(g.createdAt).toLocaleDateString()} | PO Ref: {g.poNumber || 'Manual'}
                            </p>
                          </div>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(g.totalValue)}</span>
                        </div>
                      ))}
                      {grns.filter(g => g.supplier === activeDetailCustomer.name).length === 0 && (
                        <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                          <History className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">No inbound receipts found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Sticky Actions Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex gap-2">
                {!readOnly && (
                  <>
                    <button 
                      onClick={() => {
                        openModal(activeDetailCustomer);
                        setSearchParams({ tab: activeTab });
                      }}
                      className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-black py-2.5 px-4 rounded-xl border border-slate-200 text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Modify Account
                    </button>
                    <button 
                      onClick={async () => {
                        const cust = activeDetailCustomer;
                        setSearchParams({ tab: activeTab });
                        await handleDelete(cust);
                      }}
                      className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-2.5 px-4 rounded-xl border border-rose-200 text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Purge Account
                    </button>
                  </>
                )}
              </div>
              
              <button 
                onClick={() => setSearchParams({ tab: activeTab })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .label-style {
          display: block;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94a3b8;
          margin-bottom: 0.625rem;
          padding-left: 0.25rem;
        }
      `}} />
    </div>
  );
};

const TabItem = ({ label, active, onClick, count }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`pb-4 px-2 text-sm font-bold transition-all relative ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className="flex items-center gap-2">
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </div>
    {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-bottom-1" />}
  </button>
);
;

const MetricCard = ({ label, value, icon, color, sub }) => {
  const themes = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 group transition-all hover:border-slate-300 select-none">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0 ${themes[color]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
        <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5 truncate" title={value}>{value}</p>
        {sub && <p className="text-[9px] font-medium text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
};

export default CRM;
