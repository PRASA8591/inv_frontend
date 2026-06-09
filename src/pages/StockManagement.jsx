import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  Package,
  TrendingDown,
  Database,
  History,
  X,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';

const StockManagement = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { settings, formatCurrency } = useSettings();
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin' && !user?.access?.stock_edit;
  const navigate = useNavigate();
  const { itemName } = useParams();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [sales, setSales] = useState([]);

  // Modal and Adjustment States
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adjustAmounts, setAdjustAmounts] = useState({}); // e.g. { base: '', 'batch_id': '' }
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    batchNumber: '',
    expiryDate: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    warehouseId: ''
  });

  // Transfer States
  const [activeTransferBatchId, setActiveTransferBatchId] = useState(null);
  const [transferToWH, setTransferToWH] = useState('');
  const [transferQty, setTransferQty] = useState('');

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchItems = async (whId = selectedWarehouseId) => {
    setLoading(true);
    try {
      const url = whId ? `http://localhost:5000/api/inventory?warehouseId=${whId}` : 'http://localhost:5000/api/inventory';
      const res = await axios.get(url, config);
      setItems(res.data);
    } catch (err) {
      toast.error('Inventory synchronization failure.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/warehouses', config);
      setWarehouses(res.data);
    } catch (err) {}
  };

  const fetchSales = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/sales', config);
      setSales(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    const defaultWhId = user?.currentWarehouse?._id || user?.currentWarehouse || '';
    setSelectedWarehouseId(defaultWhId);
    fetchItems(defaultWhId);
    fetchWarehouses();
    fetchSales();
  }, [user]);

  const getDaysOfCover = (itemId, currentQty) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = sales.filter(s => new Date(s.createdAt) >= thirtyDaysAgo);
    
    let totalQtySold = 0;
    recentSales.forEach(sale => {
      sale.items.forEach(it => {
        if (String(it.itemId) === String(itemId)) {
          totalQtySold += (it.quantity || 0);
        }
      });
    });

    const dailyVelocity = totalQtySold / 30;
    if (dailyVelocity === 0) return '∞ days';
    
    const days = Math.round(currentQty / dailyVelocity);
    return `${days} days`;
  };

  const handleExecuteTransfer = async (batch) => {
    if (!transferToWH || isNaN(parseFloat(transferQty)) || parseFloat(transferQty) <= 0) {
      return toast.error("Please select a target warehouse and enter a valid quantity.");
    }
    const qty = parseFloat(transferQty);
    if (qty > batch.quantity) return toast.error("Transfer quantity exceeds batch stock.");

    const fromWHId = batch.warehouseId || (warehouses.find(w => w.code === 'WH-MAIN')?._id);

    try {
      await axios.post('http://localhost:5000/api/inventory/transfer', {
        itemId: selectedItem._id,
        batchNumber: batch.batchNumber,
        fromWarehouseId: fromWHId,
        toWarehouseId: transferToWH,
        quantity: qty
      }, config);

      toast.success("Stock transferred successfully.");
      setActiveTransferBatchId(null);
      setTransferQty('');
      setTransferToWH('');
      fetchItems();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Stock transfer failed.");
    }
  };

  // Sync URL state to open modal automatically
  useEffect(() => {
    if (items.length > 0 && itemName) {
      const decodedName = decodeURIComponent(itemName).replace(/^item-/, '');
      const found = items.find(i => i.name === decodedName);
      if (found) {
        if (!selectedItem || selectedItem._id !== found._id) {
          handleOpenModal(found, false);
        }
      } else {
        navigate('/stock');
      }
    } else if (!itemName && isModalOpen) {
      setIsModalOpen(false);
      setSelectedItem(null);
    }
  }, [items, itemName]);

  const handleOpenModal = (item, updateUrl = true) => {
    setSelectedItem(item);
    setAdjustAmounts({});
    setIsAddingBatch(false);
    setNewBatchData({
      batchNumber: '',
      expiryDate: '',
      costPrice: '',
      sellingPrice: '',
      quantity: ''
    });
    setIsModalOpen(true);
    
    if (updateUrl) {
      const expectedUrl = `/stock/edit/item-${encodeURIComponent(item.name)}`;
      if (window.location.pathname !== expectedUrl) {
        navigate(expectedUrl);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsAddingBatch(false);
    setIsModalOpen(false);
    navigate('/stock');
  };

  const handleAmountChange = (key, val) => {
    setAdjustAmounts(prev => ({ ...prev, [key]: val }));
  };

  const handleStockAdjustment = async (targetBatchId, currentQty, isAdd) => {
    const key = targetBatchId || 'base';
    const amountStr = adjustAmounts[key];
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return toast.error("Please enter a valid positive quantity to adjust.");
    }

    const adjustment = isAdd ? amount : -amount;
    const newQty = currentQty + adjustment;

    if (newQty < 0) {
      return toast.error("Final stock volume cannot be negative.");
    }

    // Identify details for confirm dialog
    let batchNumber = '';
    if (targetBatchId && selectedItem.batches) {
      const batchObj = selectedItem.batches.find(b => b._id === targetBatchId);
      if (batchObj) batchNumber = batchObj.batchNumber;
    }

    const confirmed = await confirm({
      title: 'Confirm Inventory Adjustment',
      message: `Are you sure you want to ${isAdd ? 'ADD' : 'REMOVE'} ${amount} units ${batchNumber ? `for Batch: ${batchNumber}` : 'from Base Stock'}? New quantity will be ${newQty} units.`,
      confirmText: 'Save Adjustment',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      let updatedPayload = {};

      if (targetBatchId && selectedItem.batches) {
        // Map and update target batch
        const updatedBatches = selectedItem.batches.map(b => 
          b._id === targetBatchId ? { ...b, quantity: newQty } : b
        );
        updatedPayload = { batches: updatedBatches };
      } else {
        // Update global Base Qty
        updatedPayload = { quantity: newQty };
      }

      const res = await axios.put(`http://localhost:5000/api/inventory/${selectedItem._id}`, updatedPayload, config);
      
      // Update local states
      setItems(items.map(item => item._id === selectedItem._id ? res.data : item));
      setSelectedItem(res.data);
      setAdjustAmounts(prev => ({ ...prev, [key]: '' }));
      toast.success(`Inventory successfully updated to ${res.data.quantity} total units.`);
    } catch (err) {
      toast.error("Stock adjustment update failed.");
    }
  };

  const handleDeleteBatch = async (batchId, batchNumber) => {
    const confirmed = await confirm({
      title: 'Delete Stock Batch?',
      message: `Are you sure you want to permanently delete Batch: ${batchNumber}? All stock quantity associated with this batch will be lost.`,
      confirmText: 'Delete Batch',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const updatedBatches = selectedItem.batches.filter(b => b._id !== batchId);
      const res = await axios.put(`http://localhost:5000/api/inventory/${selectedItem._id}`, { batches: updatedBatches }, config);
      
      setItems(items.map(item => item._id === selectedItem._id ? res.data : item));
      setSelectedItem(res.data);
      toast.success(`Batch ${batchNumber} deleted successfully.`);
    } catch (err) {
      toast.error("Failed to delete batch.");
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    const { batchNumber, expiryDate, costPrice, sellingPrice, quantity, warehouseId } = newBatchData;

    if (!batchNumber || (settings.useExpirationDates !== false && !expiryDate) || isNaN(parseFloat(quantity)) || parseFloat(quantity) < 0) {
      return toast.error("Please fill in all required fields with valid values.");
    }

    const confirmed = await confirm({
      title: 'Create New Batch?',
      message: `Are you sure you want to add Batch: ${batchNumber} with initial stock of ${quantity} units?`,
      confirmText: 'Create Batch',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      const newBatchObj = {
        batchNumber,
        expiryDate: settings.useExpirationDates !== false ? expiryDate : null,
        costPrice: settings.useCostPrice !== false ? (parseFloat(costPrice) || 0) : 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        quantity: parseFloat(quantity) || 0,
        status: 'active',
        warehouseId: warehouseId || null
      };

      const existingBatches = selectedItem.batches || [];
      const updatedBatches = [...existingBatches, newBatchObj];

      const res = await axios.put(`http://localhost:5000/api/inventory/${selectedItem._id}`, { batches: updatedBatches }, config);
      
      setItems(items.map(item => item._id === selectedItem._id ? res.data : item));
      setSelectedItem(res.data);
      setNewBatchData({
        batchNumber: '',
        expiryDate: '',
        costPrice: '',
        sellingPrice: '',
        quantity: '',
        warehouseId: ''
      });
      setIsAddingBatch(false);
      toast.success(`New Batch ${batchNumber} added successfully.`);
    } catch (err) {
      toast.error("Failed to add new batch.");
    }
  };

  const getStockLevelInfo = (qty) => {
    if (qty <= 0) return { text: 'Depleted', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: <AlertCircle className="w-3 h-3" /> };
    if (qty <= 5) return { text: 'Critical', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: <TrendingDown className="w-3 h-3" /> };
    if (qty <= 15) return { text: 'Restock', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <RefreshCw className="w-3 h-3" /> };
    return { text: 'Optimal', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <TrendingUp className="w-3 h-3" /> };
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'low') return item.quantity > 0 && item.quantity <= 5;
    if (filterType === 'out') return item.quantity <= 0;
    return true;
  });

  const filteredWarehouses = user?.role === 'admin'
    ? warehouses
    : warehouses.filter(w => user?.allowedWarehouses?.some(aw => String(aw._id || aw) === String(w._id)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Advanced Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Intelligence</h1>
            <p className="text-sm text-slate-500 font-medium">{readOnly ? "Click on any inventory item to view active batches and stock details." : "Click on any inventory item to view active batches or perform precise stock adjustments."}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all uppercase tracking-widest">
            <History className="w-4 h-4" /> Audit Log
          </button>
          <button 
            onClick={fetchItems} 
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md shadow-blue-200 transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Items
          </button>
        </div>
      </div>

      {/* Advanced Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <FilterCard 
          active={filterType === 'all'} 
          onClick={() => setFilterType('all')}
          icon={<Package className="w-6 h-6" />}
          label="Total Managed Inventory"
          value={items.length}
          color="blue"
        />
        <FilterCard 
          active={filterType === 'low'} 
          onClick={() => setFilterType('low')}
          icon={<TrendingDown className="w-6 h-6" />}
          label="Critical Level Alerts"
          value={items.filter(i => i.quantity > 0 && i.quantity <= 5).length}
          color="amber"
        />
        <FilterCard 
          active={filterType === 'out'} 
          onClick={() => setFilterType('out')}
          icon={<AlertCircle className="w-6 h-6" />}
          label="Stock Depletion Index"
          value={items.filter(i => i.quantity <= 0).length}
          color="rose"
        />
      </div>

      {/* Inventory Nodes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-[300px] group">
              <Search className="absolute left-4 inset-y-0 my-auto h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Filter by SKU or Designation..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                fetchItems(e.target.value);
              }}
              className="w-full sm:w-60 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 cursor-pointer"
            >
              {user?.role === 'admin' && <option value="">All Warehouses</option>}
              {filteredWarehouses.map(w => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing: <span className="text-blue-600">{filteredItems.length} Items</span></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Item Name</th>
                <th className="px-6 py-5">Current Quantity</th>
                <th className="px-6 py-5">Days of Cover</th>
                <th className="px-6 py-5">Health Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item) => {
                const info = getStockLevelInfo(item.quantity);
                return (
                  <tr 
                    key={item._id} 
                    onClick={() => handleOpenModal(item)}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">SKU: {item.sku}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 tracking-tighter">{item.quantity}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Units</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-mono font-bold text-slate-700">
                      {getDaysOfCover(item._id, item.quantity)}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${info.color}`}>
                        {info.icon}
                        {info.text}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-xs text-blue-600 group-hover:underline font-bold">{readOnly ? 'View Stock Details' : 'View & Adjust Stock'}</span>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <Database className="w-20 h-20 text-slate-300" />
                       <p className="mt-4 font-black uppercase tracking-[0.3em] text-xs">No Items Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{readOnly ? 'Stock Details' : 'Stock Adjustment'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedItem.name}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-white/10 rounded-xl transition-all relative z-10"><X className="w-6 h-6"/></button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Item Overview Summary */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">SKU</span>
                  <span className="text-xs font-bold text-slate-800 uppercase font-mono">{selectedItem.sku}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Category</span>
                  <span className="text-xs font-bold text-slate-800">{selectedItem.category}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Total Quantity</span>
                  <span className="text-sm font-black text-blue-600">{selectedItem.quantity} Units</span>
                </div>
              </div>

              {/* Batch-wise inventory list */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Stock Breakdown & Batches</h4>
                
                {selectedItem.batches && selectedItem.batches.length > 0 && settings.useBatchNumbers !== false ? (
                  <div className="space-y-4">
                    {selectedItem.batches.map(batch => (
                      <div key={batch._id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-sm">Batch: {batch.batchNumber}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                batch.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>{batch.status}</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded text-[8px] font-black uppercase tracking-wider">
                                WH: {warehouses.find(w => String(w._id) === String(batch.warehouseId))?.code || 'WH-MAIN'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-bold uppercase mt-2">
                              {settings.useExpirationDates !== false && batch.expiryDate && (
                                <span>Exp: {new Date(batch.expiryDate).toLocaleDateString()}</span>
                              )}
                              <span className="text-right">Price: {formatCurrency(batch.sellingPrice)}</span>
                            </div>
                            <div className="text-xs font-bold text-slate-700 mt-2">
                              Current Batch Stock: <span className="text-blue-600 font-black">{batch.quantity} Units</span>
                            </div>
                          </div>

                          {/* Adjust Action Interface for Batch */}
                          {!readOnly ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input 
                                type="number" 
                                className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                                placeholder="Qty..."
                                value={adjustAmounts[batch._id] || ''}
                                onChange={(e) => handleAmountChange(batch._id, e.target.value)}
                                min="1"
                              />
                              <button 
                                onClick={() => handleStockAdjustment(batch._id, batch.quantity, true)}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                              <button 
                                onClick={() => handleStockAdjustment(batch._id, batch.quantity, false)}
                                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Minus className="w-3.5 h-3.5" /> Rem
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveTransferBatchId(activeTransferBatchId === batch._id ? null : batch._id);
                                  setTransferQty('');
                                  setTransferToWH('');
                                }}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm active:scale-95"
                                title="Transfer Stock to another Warehouse"
                              >
                                Transfer
                              </button>
                              <button 
                                onClick={() => handleDeleteBatch(batch._id, batch.batchNumber)}
                                className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-sm active:scale-95 border border-transparent hover:border-rose-200"
                                title="Delete Batch"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase">View Only</span>
                          )}
                        </div>

                        {/* Inline Transfer block */}
                        {activeTransferBatchId === batch._id && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 w-full animate-in slide-in-from-top-2 duration-300">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transfer Batch Stock</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <select 
                                value={transferToWH} 
                                onChange={(e) => setTransferToWH(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="">Select Target Warehouse...</option>
                                {warehouses.filter(w => String(w._id) !== String(batch.warehouseId || (warehouses.find(wh => wh.code === 'WH-MAIN')?._id))).map(w => (
                                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                ))}
                              </select>
                              <input 
                                type="number" 
                                value={transferQty} 
                                onChange={(e) => setTransferQty(e.target.value)}
                                placeholder="Qty to transfer..."
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                                max={batch.quantity}
                                min="1"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button 
                                type="button" 
                                onClick={() => { setActiveTransferBatchId(null); setTransferQty(''); setTransferToWH(''); }}
                                className="px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleExecuteTransfer(batch)}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase shadow-sm"
                              >
                                Confirm Transfer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Global Stock Adjustment if no batches exist
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">Base Stock Quantity</span>
                      <span className="text-xs font-bold text-slate-400 mt-1 block">This item does not utilize strict batch-wise reconciliation.</span>
                      <div className="text-xs font-bold text-slate-700 mt-3">
                        Current Base Stock: <span className="text-blue-600 font-black">{selectedItem.quantity} Units</span>
                      </div>
                    </div>

                    {/* Adjust Action Interface for Base Stock */}
                    {!readOnly ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          className="w-28 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                          placeholder="Qty to adjust..."
                          value={adjustAmounts.base || ''}
                          onChange={(e) => handleAmountChange('base', e.target.value)}
                          min="1"
                        />
                        <button 
                          onClick={() => handleStockAdjustment(null, selectedItem.quantity, true)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                        <button 
                          onClick={() => handleStockAdjustment(null, selectedItem.quantity, false)}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 uppercase">View Only</span>
                    )}
                  </div>
                )}

              </div>

              {/* Register New Batch Section */}
              {!readOnly && settings.useBatchNumbers !== false && (
                <div className="pt-6 border-t border-slate-100">
                  {!isAddingBatch ? (
                    <button 
                      type="button"
                      onClick={() => setIsAddingBatch(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 border border-dashed border-blue-300 hover:bg-blue-100/70 text-blue-700 font-black rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-98"
                    >
                      <Plus className="w-4 h-4" /> Register New Stock Batch
                    </button>
                  ) : (
                    <form onSubmit={handleAddBatch} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add New Batch</span>
                        <button 
                          type="button" 
                          onClick={() => setIsAddingBatch(false)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className={settings.useExpirationDates !== false ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Batch Number *</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. BATCH-100"
                            value={newBatchData.batchNumber}
                            onChange={(e) => setNewBatchData({ ...newBatchData, batchNumber: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        {settings.useExpirationDates !== false && (
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expiry Date *</label>
                            <input 
                              type="date"
                              required
                              value={newBatchData.expiryDate}
                              onChange={(e) => setNewBatchData({ ...newBatchData, expiryDate: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        )}
                      </div>

                      <div className={settings.useCostPrice !== false ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
                        {settings.useCostPrice !== false && (
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cost Price</label>
                            <input 
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={newBatchData.costPrice}
                              onChange={(e) => setNewBatchData({ ...newBatchData, costPrice: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Selling Price</label>
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newBatchData.sellingPrice}
                            onChange={(e) => setNewBatchData({ ...newBatchData, sellingPrice: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Initial Quantity *</label>
                          <input 
                            type="number"
                            required
                            min="0"
                            placeholder="0"
                            value={newBatchData.quantity}
                            onChange={(e) => setNewBatchData({ ...newBatchData, quantity: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Warehouse Location *</label>
                          <select 
                            required
                            value={newBatchData.warehouseId}
                            onChange={(e) => setNewBatchData({ ...newBatchData, warehouseId: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="">Select Warehouse...</option>
                            {filteredWarehouses.map(w => (
                              <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                      >
                        Save New Batch
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={handleCloseModal} 
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

const FilterCard = ({ active, onClick, icon, label, value, color }) => {
  const themes = {
    blue: "border-blue-200 bg-blue-50/50 shadow-blue-100",
    amber: "border-amber-200 bg-amber-50/50 shadow-amber-100",
    rose: "border-rose-200 bg-rose-50/50 shadow-rose-100"
  };
  const iconColors = { blue: "text-blue-600", amber: "text-amber-600", rose: "text-rose-600" };

  return (
    <button 
      onClick={onClick} 
      className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
        active ? themes[color] + " shadow-xl ring-4 ring-white" : "border-slate-100 bg-white hover:border-slate-200"
      }`}
    >
      <div className={`mb-4 transition-transform group-hover:scale-110 ${active ? iconColors[color] : 'text-slate-300'}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
      <h4 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{value}</h4>
      {active && <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-20 ${color === 'blue' ? 'bg-blue-600' : color === 'amber' ? 'bg-amber-600' : 'bg-rose-600'}`} />}
    </button>
  );
};

export default StockManagement;
