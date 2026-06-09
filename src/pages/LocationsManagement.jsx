import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  LayoutGrid, 
  List, 
  Building, 
  ShieldAlert, 
  Check, 
  Globe, 
  RefreshCw,
  Clock,
  Sparkles,
  ToggleLeft,
  X
} from 'lucide-react';

const LocationsManagement = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { formatCurrency, settings } = useSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    type: 'Warehouse',
    manager: '',
    status: 'active'
  });

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const API_URL = 'http://localhost:5000/api/warehouses';

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const [whRes, invRes] = await Promise.all([
        axios.get(API_URL, config),
        axios.get('http://localhost:5000/api/inventory', config).catch(() => ({ data: [] }))
      ]);
      setWarehouses(whRes.data);
      setInventory(invRes.data || []);
    } catch (err) {
      toast.error('Failed to load locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Generate a clean location code based on the name entered
  const generateCode = () => {
    if (!formData.name) {
      return toast.warning('Please enter a location name first.');
    }
    const cleanName = formData.name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    
    let generated = 'LOC-';
    if (cleanName.length === 1) {
      generated += cleanName[0].slice(0, 4);
    } else {
      generated += cleanName.map(word => word[0]).join('').slice(0, 4);
    }
    
    // Add random suffix to avoid duplicates
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    generated = `${generated}-${randomSuffix}`;
    
    setFormData(prev => ({ ...prev, code: generated }));
    toast.success('Suggested code generated!');
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      type: 'Warehouse',
      manager: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (wh) => {
    setEditingId(wh._id);
    setFormData({
      name: wh.name,
      code: wh.code,
      address: wh.address || '',
      phone: wh.phone || '',
      email: wh.email || '',
      type: wh.type || 'Warehouse',
      manager: wh.manager || '',
      status: wh.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      return toast.error('Name and code are required fields.');
    }

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData, config);
        toast.success(`Location ${formData.name} updated successfully.`);
      } else {
        await axios.post(API_URL, formData, config);
        toast.success(`Location ${formData.name} created successfully.`);
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save location.');
    }
  };

  const handleDelete = async (wh) => {
    if (wh.code === 'WH-MAIN') {
      return toast.error('Standard Protection: The Main HQ warehouse cannot be removed.');
    }

    const confirmed = await confirm({
      title: 'Delete Location?',
      message: `Are you sure you want to permanently delete "${wh.name}"? This action will fail if the location has active stock lot batches.`,
      confirmText: 'Delete Location',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/${wh._id}`, config);
      toast.success('Location deleted successfully.');
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete operation blocked. Transfer inventory batches first.');
    }
  };

  const calculateWarehouseStats = (warehouseId) => {
    let uniqueItems = 0;
    let totalQty = 0;
    let totalValuation = 0;

    inventory.forEach(item => {
      let hasBatchInWarehouse = false;
      (item.batches || []).forEach(batch => {
        if (batch.warehouseId === warehouseId) {
          if (batch.quantity > 0) {
            hasBatchInWarehouse = true;
            totalQty += batch.quantity;
            totalValuation += batch.quantity * (batch.costPrice || item.costPrice || 0);
          }
        }
      });
      if (hasBatchInWarehouse) {
        uniqueItems++;
      }
    });

    return { uniqueItems, totalQty, totalValuation };
  };

  const filteredLocations = warehouses.filter(wh => 
    wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (wh.address && wh.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Statistics summaries
  const totalCount = warehouses.length;
  const activeCount = warehouses.filter(w => w.status === 'active').length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-8 rounded-2xl border border-slate-700/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group select-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/30 backdrop-blur-md border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">Location & Node Management</h1>
            <p className="text-sm text-slate-400 font-medium">Configure corporate warehouse outlets, distribution hubs, and retail branch networks.</p>
          </div>
        </div>

        {isAdmin && (
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-xs uppercase tracking-wider relative z-10 shrink-0"
          >
            <Plus className="w-4.5 h-4.5" /> Add Location
          </button>
        )}
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Registered Locations</span>
            <span className="text-3xl font-black text-slate-800">{totalCount}</span>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Operations</span>
            <span className="text-3xl font-black text-emerald-600">{activeCount}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
            <Check className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Suspended Nodes</span>
            <span className="text-3xl font-black text-amber-600">{inactiveCount}</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80 relative group">
          <Search className="absolute left-3.5 inset-y-0 my-auto h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by code, branch name..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Layout View</span>
          <div className="bg-slate-100 rounded-lg p-0.5 border border-slate-200/40 flex items-center">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid Layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Table Layout"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={fetchWarehouses}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid/Table Loader Panel */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-24 text-center">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Synchronizing location directory...</p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-24 text-center select-none">
          <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-40 animate-bounce" style={{ animationDuration: '3s' }} />
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">No Locations Found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">No warehouses or outlet locations match your search query or are currently configured.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW LAYOUT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map(wh => {
            const isHQ = wh.code === 'WH-MAIN';
            const isActive = wh.status === 'active';
            const stats = calculateWarehouseStats(wh._id);
            
            return (
              <div 
                key={wh._id}
                className="bg-white border border-slate-200 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between relative group"
              >
                {/* Upper Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-wider rounded border border-slate-200">
                        {wh.type || 'Warehouse'}
                      </span>
                      {isHQ && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-black uppercase tracking-wider rounded border border-blue-100">
                          HQ Store
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {wh.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">{wh.name}</h3>
                    <p className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mt-1">{wh.code}</p>
                  </div>

                  <p className="text-xs text-slate-500 font-medium line-clamp-2 min-h-[2rem]">
                    {wh.address || 'No physical street address recorded.'}
                  </p>

                  {/* Profile info: manager, phone, email */}
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-500 font-medium">
                    {wh.manager && <p>Manager: <span className="text-slate-800 font-bold">{wh.manager}</span></p>}
                    {wh.phone && <p>Phone: <span className="text-slate-700">{wh.phone}</span></p>}
                    {wh.email && <p>Email: <span className="text-slate-700">{wh.email}</span></p>}
                  </div>

                  {/* Dynamic stats */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unique Items</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5">{stats.uniqueItems}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Qty</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5">{stats.totalQty}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valuation</p>
                      <p className="text-sm font-black text-blue-600 mt-0.5">{formatCurrency(stats.totalValuation)}</p>
                    </div>
                  </div>
                </div>

                {/* Operations Footbar */}
                {isAdmin && (
                  <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                      onClick={() => openEditModal(wh)}
                      className="p-2 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                      title="Edit details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!isHQ && (
                      <button 
                        onClick={() => handleDelete(wh)}
                        className="p-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                        title="Delete location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW LAYOUT */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Location Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Manager / Contact</th>
                  <th className="px-6 py-4 text-center">Unique Items</th>
                  <th className="px-6 py-4 text-center">Total Qty</th>
                  <th className="px-6 py-4 text-right">Valuation</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredLocations.map(wh => {
                  const isHQ = wh.code === 'WH-MAIN';
                  const isActive = wh.status === 'active';
                  const stats = calculateWarehouseStats(wh._id);
                  
                  return (
                    <tr key={wh._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] font-bold text-blue-600">{wh.code}</td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-800">{wh.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{wh.address || 'No address'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${isHQ ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {wh.type || 'Warehouse'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {wh.manager ? (
                          <>
                            <div className="font-bold text-slate-700">{wh.manager}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{wh.phone || wh.email || 'No contact info'}</div>
                          </>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">{stats.uniqueItems}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">{stats.totalQty}</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">{formatCurrency(stats.totalValuation)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {wh.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => openEditModal(wh)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4.5 h-4.5" />
                          </button>
                          {!isHQ && (
                            <button 
                              onClick={() => handleDelete(wh)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advanced Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-slate-200/50 shadow-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="flex items-center gap-3 relative z-10">
                <Building className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-black text-lg tracking-tight">{editingId ? 'Edit Branch Location' : 'Register Location Node'}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Corporate Inventory Structure</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors relative z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              {/* Location Name */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Location Name *</label>
                <input 
                  type="text"
                  name="name"
                  placeholder="e.g. London Logistics Outlet"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>

              {/* Code Field with Suggested Generator helper */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center pr-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Unique Location Code *</label>
                  {!editingId && (
                    <button 
                      type="button" 
                      onClick={generateCode}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" /> Suggest Code
                    </button>
                  )}
                </div>
                <input 
                  type="text"
                  name="code"
                  placeholder="e.g. WH-BR-A"
                  value={formData.code}
                  onChange={handleInputChange}
                  disabled={!!editingId}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all disabled:opacity-50 font-mono"
                  required
                />
              </div>

              {/* Type and Manager */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Location Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                    required
                  >
                    <option value="Warehouse">Warehouse</option>
                    <option value="Retail Store">Retail Store</option>
                    <option value="Distribution Center">Distribution Center</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Manager Name</label>
                  <input
                    type="text"
                    name="manager"
                    placeholder="e.g. John Doe"
                    value={formData.manager}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Comms Phone</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="e.g. +1 555-0199"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. branch@company.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Physical Address */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Physical Address</label>
                <input 
                  type="text"
                  name="address"
                  placeholder="e.g. 102 Business Plaza, Sector 4, London"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Operational Status (Toggle tabs) */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Operational Status</label>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/40">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      formData.status === 'active' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60 font-black' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    disabled={formData.code === 'WH-MAIN'}
                    onClick={() => setFormData(prev => ({ ...prev, status: 'inactive' }))}
                    className={`py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-30 ${
                      formData.status === 'inactive' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60 font-black' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Suspended
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-blue-500/10 active:scale-98 transition-all"
                >
                  {editingId ? 'Save Changes' : 'Create Location'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LocationsManagement;
