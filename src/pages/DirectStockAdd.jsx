import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  PlusCircle, 
  Trash2, 
  Calendar,
  Sparkles,
  Database,
  ArrowRight,
  X
} from 'lucide-react';

const DirectStockAdd = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  
  // Search and selection states
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form input states
  const [qty, setQty] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  // Intake list staging queue
  const [intakeList, setIntakeList] = useState([]);
  const searchRef = useRef(null);

  const API_URL = 'http://localhost:5000/api/inventory';
  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch catalog items for search
  const fetchCatalogItems = async () => {
    try {
      const res = await axios.get(API_URL, config);
      setCatalogItems(res.data.filter(item => item.status === 'active'));
    } catch (err) {
      toast.error('Failed to load product catalog.');
    }
  };

  useEffect(() => {
    fetchCatalogItems();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items matching search term
  const filteredCatalog = catalogItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Select item handler
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchTerm(item.name);
    setShowDropdown(false);
    setQty('1'); // Default qty
  };

  // Add to staging queue
  const handleAddToList = (e) => {
    e.preventDefault();
    if (!selectedItem) {
      return toast.warning('Please select a product first.');
    }

    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return toast.error('Intake quantity must be a positive number.');
    }

    if (hasExpiry && !expiryDate) {
      return toast.error('Please specify an expiry date or toggle off expiry.');
    }

    const newIntakeEntry = {
      id: Date.now().toString(), // unique row identifier
      itemId: selectedItem._id,
      name: selectedItem.name,
      sku: selectedItem.sku,
      unitType: selectedItem.unitType || 'pieces',
      quantity: parsedQty,
      hasExpiry,
      expiryDate: hasExpiry ? expiryDate : null
    };

    setIntakeList(prev => [...prev, newIntakeEntry]);
    toast.success(`${selectedItem.name} added to the intake list.`);

    // Clear item inputs for next selection
    setSelectedItem(null);
    setSearchTerm('');
    setQty('');
    setHasExpiry(false);
    setExpiryDate('');
  };

  // Remove item from list
  const handleRemoveFromList = (rowId) => {
    setIntakeList(prev => prev.filter(row => row.id !== rowId));
  };

  // Clear staging list
  const handleClearStaging = async () => {
    if (intakeList.length === 0) return;
    const confirmed = await confirm({
      title: 'Clear Intake List?',
      message: 'Are you sure you want to remove all staged items from the intake list? This action cannot be undone.',
      confirmText: 'Clear List',
      type: 'danger'
    });
    if (confirmed) {
      setIntakeList([]);
      toast.info('Staged intake list cleared.');
    }
  };

  // Generator for fresh batch codes
  const generateBatchCode = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `BAT-${today}-${randomSuffix}`;
  };

  // Submit direct intake queue
  const handleSubmitIntake = async () => {
    if (intakeList.length === 0) return;

    const confirmed = await confirm({
      title: 'Confirm Direct Stock Intake',
      message: `Are you sure you want to add stock for ${intakeList.length} unique products directly into the catalog? Batch numbers will be auto-generated.`,
      confirmText: 'Confirm & Process',
      type: 'warning'
    });

    if (!confirmed) return;

    setLoading(true);
    let successCount = 0;

    try {
      for (const entry of intakeList) {
        // Fetch fresh copy of item to avoid stale overwriting of existing batches
        const getRes = await axios.get(`${API_URL}/${entry.itemId}`, config);
        const dbItem = getRes.data;

        const currentBatches = dbItem.batches || [];

        // Safe migration: If database item has quantity but batches list is empty,
        // package the existing quantity as a BAT-INITIAL batch to prevent data loss.
        if (currentBatches.length === 0 && dbItem.quantity > 0) {
          currentBatches.push({
            batchNumber: 'BAT-INITIAL',
            expiryDate: null,
            costPrice: dbItem.movingAverageCost || dbItem.costPrice || 0,
            sellingPrice: dbItem.price || dbItem.sellingPrice || 0,
            quantity: dbItem.quantity,
            status: 'active'
          });
        }

        // Generate the new intake batch, inheriting item's current cost and selling price defaults
        const newBatch = {
          batchNumber: generateBatchCode(),
          expiryDate: entry.expiryDate,
          costPrice: dbItem.movingAverageCost || dbItem.costPrice || 0,
          sellingPrice: dbItem.price || dbItem.sellingPrice || 0,
          quantity: entry.quantity,
          status: 'active',
          warehouseId: user?.currentWarehouse?._id || user?.currentWarehouse || null
        };

        const updatedBatches = [...currentBatches, newBatch];

        // Structure audit details payload for Direct Stock Report
        const auditDetailsObj = {
          itemName: dbItem.name,
          sku: dbItem.sku,
          qty: entry.quantity,
          unitType: entry.unitType || 'pieces',
          batchNumber: newBatch.batchNumber,
          expiryDate: entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : null
        };

        // Send put request updating the batches and logging audit trail
        await axios.put(`${API_URL}/${entry.itemId}`, { 
          batches: updatedBatches,
          auditAction: 'DIRECT_STOCK_ADD',
          auditDetails: JSON.stringify(auditDetailsObj)
        }, config);
        successCount++;
      }

      toast.success(`Successfully processed direct intake for ${successCount} items.`);
      setIntakeList([]);
      fetchCatalogItems(); // refresh memory cache
    } catch (err) {
      console.error(err);
      toast.error(`Incomplete transaction. Processed ${successCount} of ${intakeList.length} items.`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const aggregateQuantity = intakeList.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-8 rounded-2xl border border-slate-700/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group select-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/30 backdrop-blur-md border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
            <PlusCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">Direct Stock Intake</h1>
            <p className="text-sm text-slate-400 font-medium">Increment inventory lots directly. Avoid PO/GRN overhead. Auto-generate serial batches.</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Intake List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Staging Input Form (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Lot Information Builder
            </h2>

            <form onSubmit={handleAddToList} className="space-y-4">
              
              {/* Product Autocomplete Lookup */}
              <div className="relative" ref={searchRef}>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Select Item *</label>
                <div className="relative group">
                  <Search className="absolute left-3.5 inset-y-0 my-auto h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by name, SKU, or barcode..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      if (selectedItem && e.target.value !== selectedItem.name) {
                        setSelectedItem(null);
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium"
                  />
                  {searchTerm && (
                    <button 
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedItem(null);
                        setShowDropdown(false);
                      }}
                      className="absolute right-3.5 inset-y-0 my-auto p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Combobox Dropdown */}
                {showDropdown && filteredCatalog.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredCatalog.map(item => (
                      <div
                        key={item._id}
                        onClick={() => handleSelectItem(item)}
                        className="px-4 py-3 hover:bg-blue-50/50 cursor-pointer border-b border-slate-50 transition-colors flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">SKU: {item.sku}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-700">{item.quantity} {item.unitType || 'pieces'}</span>
                          <div className="text-[9px] text-slate-400 uppercase font-black">Current Stock</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showDropdown && searchTerm && filteredCatalog.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center text-xs text-slate-400 font-medium">
                    No active items match "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Selected Item Overview Panel */}
              {selectedItem && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>Item Specs</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-black tracking-wider text-[8px]">
                      {selectedItem.unitType}
                    </span>
                  </div>
                  <div className="text-xs font-black text-slate-800 line-clamp-1">{selectedItem.name}</div>
                  <div className="grid grid-cols-2 gap-4 text-[10px] pt-1 border-t border-slate-200/50">
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">Current Stock</span>
                      <span className="font-black text-slate-700">{selectedItem.quantity} units</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">Category</span>
                      <span className="font-black text-slate-700">{selectedItem.category}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity Input */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Intake Quantity *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Enter positive quantity..."
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold"
                  required
                />
              </div>

              {/* Expiry Selector Mode Tabs */}
              {settings.useExpirationDates !== false && (
                <>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Expiry Rule</label>
                    <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/40">
                      <button
                        type="button"
                        onClick={() => setHasExpiry(false)}
                        className={`py-2 text-xs font-bold rounded-lg transition-all ${
                          !hasExpiry 
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        No Expiry
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasExpiry(true)}
                        className={`py-2 text-xs font-bold rounded-lg transition-all ${
                          hasExpiry 
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        With Expiry Date
                      </button>
                    </div>
                  </div>

                  {/* Expiry Date Picker (Conditional) */}
                  {hasExpiry && (
                    <div className="animate-in slide-in-from-top-4 duration-200">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Expiry Date *</label>
                      <div className="relative group">
                        <Calendar className="absolute left-3.5 inset-y-0 my-auto h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold"
                          required={hasExpiry}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Add to Intake List Button */}
              <button
                type="submit"
                disabled={!selectedItem}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-100 disabled:shadow-none transition-all active:scale-98 text-xs uppercase tracking-widest mt-4"
              >
                <Plus className="w-4 h-4" /> Add to Intake List
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Staged Staging Queue (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            
            {/* List Header */}
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Staged Intake Inventory List
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Queue: {intakeList.length} Staged Lots</p>
              </div>

              {intakeList.length > 0 && (
                <button
                  onClick={handleClearStaging}
                  className="px-3.5 py-1.5 border border-red-200 hover:border-red-600 text-red-500 hover:text-white hover:bg-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Staged List
                </button>
              )}
            </div>

            {/* List Body (Staging Table) */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left min-w-[650px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-6 py-4">Item Name / SKU</th>
                    <th className="px-6 py-4 text-center">Intake Qty</th>
                    <th className="px-6 py-4">Batch Code</th>
                    <th className="px-6 py-4">Expiry Condition</th>
                    <th className="px-6 py-4 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {intakeList.map((entry) => {
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 max-w-xs truncate" title={entry.name}>{entry.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">SKU: {entry.sku}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-slate-700">
                          {entry.quantity} <span className="text-[10px] text-slate-400 font-bold uppercase">{entry.unitType}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-blue-600 font-bold">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100">Auto-Generated</span>
                        </td>
                        <td className="px-6 py-4">
                          {entry.hasExpiry ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-black uppercase">
                              <Calendar className="w-3 h-3" />
                              {new Date(entry.expiryDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Expiry</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRemoveFromList(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {intakeList.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-24 text-center text-slate-400">
                        <div className="flex flex-col items-center opacity-30">
                          <Database className="w-16 h-16 text-slate-300" />
                          <p className="mt-4 font-black uppercase tracking-[0.2em] text-[10px]">Staging Queue Empty</p>
                          <p className="text-[9px] font-medium text-slate-400 mt-1 max-w-xs">Use the builder form on the left to select items, specify batch quantities, and add them to this table.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* List Footer Panel */}
            {intakeList.length > 0 && (
              <div className="p-6 bg-slate-950 text-white border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-8 text-center md:text-left">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Staged Quantity</span>
                    <span className="text-xl font-black text-white">{aggregateQuantity} Units</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setIntakeList([]);
                      toast.info('Session cancelled.');
                    }}
                    className="flex-1 md:flex-none px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel Session
                  </button>
                  <button
                    onClick={handleSubmitIntake}
                    disabled={loading}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest"
                  >
                    {loading ? (
                      <>Processing Intake...</>
                    ) : (
                      <>
                        Commit Stock Intake <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};

export default DirectStockAdd;
