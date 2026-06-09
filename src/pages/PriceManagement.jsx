import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { 
  Tag, 
  Search, 
  Save, 
  RefreshCw,
  Calculator,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  X,
  DollarSign,
  TrendingUp,
  Sliders,
  Layers3
} from 'lucide-react';

const PriceManagement = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { itemName } = useParams();
  const { formatCurrency, settings } = useSettings();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal and Price adjustment states
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchPrices, setBatchPrices] = useState({}); // e.g. { batchId: { sellingPrice: '', costPrice: '' } }
  const [globalCostInput, setGlobalCostInput] = useState('');
  const [globalSellInput, setGlobalSellInput] = useState('');

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/inventory', config);
      setItems(res.data);
    } catch (err) {
      toast.error('Financial sync failure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Sync URL state to open modal automatically
  useEffect(() => {
    if (items.length > 0 && itemName) {
      const decodedName = decodeURIComponent(itemName).replace(/^item-/, '');
      const found = items.find(i => i.name === decodedName);
      if (found) {
        openAdjustmentModal(found);
      } else {
        // If not found, clean the URL
        navigate('/price');
      }
    } else if (!itemName && isModalOpen) {
      // If URL cleared, close the modal
      setIsModalOpen(false);
      setSelectedItem(null);
    }
  }, [items, itemName]);

  const openAdjustmentModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    
    // Initialize batch price inputs
    const initialBatchPrices = {};
    if (item.batches && item.batches.length > 0) {
      item.batches.forEach(b => {
        initialBatchPrices[b._id] = {
          sellingPrice: b.sellingPrice.toString(),
          costPrice: b.costPrice.toString()
        };
      });
    } else {
      initialBatchPrices.base = {
        sellingPrice: item.price.toString(),
        costPrice: (item.movingAverageCost || 0).toString()
      };
    }
    setBatchPrices(initialBatchPrices);
    setGlobalCostInput('');
    setGlobalSellInput('');
    
    // Update URL if not already matching
    const expectedUrl = `/price/edit/item-${encodeURIComponent(item.name)}`;
    if (window.location.pathname !== expectedUrl) {
      navigate(expectedUrl);
    }
  };

  const closeAdjustmentModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    navigate('/price');
  };

  const handlePriceFieldChange = (key, field, val) => {
    setBatchPrices(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val
      }
    }));
  };

  const handleUpdateBatchPrice = async (targetBatchId, batchNumber) => {
    const key = targetBatchId || 'base';
    const sellingPrice = parseFloat(batchPrices[key]?.sellingPrice);
    const costPrice = parseFloat(batchPrices[key]?.costPrice);

    if (isNaN(sellingPrice) || sellingPrice < 0 || isNaN(costPrice) || costPrice < 0) {
      return toast.error("Please enter valid positive pricing metrics.");
    }

    const confirmed = await confirm({
      title: 'Confirm Price Modification',
      message: `Adjust pricing for ${batchNumber ? `Batch: ${batchNumber}` : 'Base Stock'}? New Selling: ${formatCurrency(sellingPrice)} | Cost: ${formatCurrency(costPrice)}`,
      confirmText: 'Update Price',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      let updatedPayload = {};

      if (targetBatchId && selectedItem.batches) {
        // Map and update specific batch prices
        const updatedBatches = selectedItem.batches.map(b => 
          b._id === targetBatchId ? { ...b, sellingPrice, costPrice } : b
        );
        updatedPayload = { batches: updatedBatches };
      } else {
        // Update global base selling and cost prices
        updatedPayload = { price: sellingPrice, movingAverageCost: costPrice };
      }

      const res = await axios.put(`http://localhost:5000/api/inventory/${selectedItem._id}`, updatedPayload, config);
      
      // Sync local states
      setItems(items.map(item => item._id === selectedItem._id ? res.data : item));
      setSelectedItem(res.data);
      toast.success("Pricing metrics securely adjusted.");
    } catch (err) {
      toast.error("Failed to save price changes.");
    }
  };

  const handleApplyGlobalPrices = async () => {
    const sellingPrice = parseFloat(globalSellInput);
    const costPrice = parseFloat(globalCostInput);

    if (isNaN(sellingPrice) || sellingPrice < 0 || isNaN(costPrice) || costPrice < 0) {
      return toast.error("Please enter a valid selling price and cost price to apply.");
    }

    const confirmed = await confirm({
      title: 'Apply Pricing to All Batches?',
      message: `This will update ALL ${selectedItem.batches.length} batches for "${selectedItem.name}" to Selling: ${formatCurrency(sellingPrice)} and Cost: ${formatCurrency(costPrice)}. Are you sure?`,
      confirmText: 'Apply to All Batches',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      const updatedBatches = selectedItem.batches.map(b => ({
        ...b,
        sellingPrice,
        costPrice
      }));

      // Update both global averages and nested batches
      const updatedPayload = {
        price: sellingPrice,
        movingAverageCost: costPrice,
        batches: updatedBatches
      };

      const res = await axios.put(`http://localhost:5000/api/inventory/${selectedItem._id}`, updatedPayload, config);
      
      // Sync local states
      setItems(items.map(item => item._id === selectedItem._id ? res.data : item));
      setSelectedItem(res.data);
      
      // Update form values in modal
      const newBatchPrices = {};
      res.data.batches.forEach(b => {
        newBatchPrices[b._id] = {
          sellingPrice: b.sellingPrice.toString(),
          costPrice: b.costPrice.toString()
        };
      });
      setBatchPrices(newBatchPrices);
      setGlobalCostInput('');
      setGlobalSellInput('');
      
      toast.success("Pricing successfully applied to all batches!");
    } catch (err) {
      toast.error("Price update failed.");
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Advanced Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Price Configuration</h1>
            <p className="text-sm text-slate-500 font-medium">Click on any product row to manage Cost and Selling Prices batch-wise or globally.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchItems} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pricing Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-[400px] group">
            <Search className="absolute left-4 inset-y-0 my-auto h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Query SKU or Classification..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-white rounded-lg border border-slate-100">Showing: <span className="text-indigo-600">{filteredItems.length} Items</span></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Item Details</th>
                <th className="px-6 py-5">Moving Average Cost</th>
                <th className="px-6 py-5">Global Selling Price</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item) => {
                return (
                  <tr 
                    key={item._id} 
                    onClick={() => openAdjustmentModal(item)}
                    className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{item.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold tracking-tight">SKU: {item.sku}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{item.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-slate-600">
                      {formatCurrency(item.movingAverageCost || 0)}
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-indigo-600">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-xs text-indigo-600 group-hover:underline font-bold">Configure Pricing</span>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <Calculator className="w-20 h-20 text-slate-300" />
                       <p className="mt-4 font-black uppercase tracking-[0.3em] text-xs">No Items Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Adjustment Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 my-8">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Price Configuration</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedItem.name}</p>
                </div>
              </div>
              <button onClick={closeAdjustmentModal} className="p-2 hover:bg-white/10 rounded-xl transition-all relative z-10"><X className="w-6 h-6"/></button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Item Overview Summary */}
              <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">SKU</span>
                  <span className="text-xs font-bold text-slate-800 uppercase font-mono">{selectedItem.sku}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Category</span>
                  <span className="text-xs font-bold text-slate-800">{selectedItem.category}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Base Cost</span>
                  <span className="text-xs font-bold text-slate-700">{formatCurrency(selectedItem.movingAverageCost || 0)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Base Selling</span>
                  <span className="text-sm font-black text-indigo-600">{formatCurrency(selectedItem.price)}</span>
                </div>
              </div>

              {/* Batch-wise inventory list */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pricing Breakdown & Batches</h4>
                
                {selectedItem.batches && selectedItem.batches.length > 0 ? (
                  <div className="space-y-4">
                    {selectedItem.batches.map(batch => {
                      const key = batch._id;
                      return (
                        <div key={batch._id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <span className="font-bold text-slate-800 text-sm block">Batch: {batch.batchNumber}</span>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-bold uppercase mt-2">
                              <span>Exp: {new Date(batch.expiryDate).toLocaleDateString()}</span>
                              <span className="text-right">Quantity: {batch.quantity} Units</span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold mt-2 uppercase">
                              <span>Current Selling: <strong className="text-indigo-600">{formatCurrency(batch.sellingPrice)}</strong></span>
                              <span>Current Cost: <strong>{formatCurrency(batch.costPrice)}</strong></span>
                            </div>
                          </div>

                          {/* Adjustment Fields */}
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Cost price</span>
                              <div className="relative w-28">
                                <span className="absolute left-2.5 inset-y-0 flex items-center font-bold text-slate-400 text-[10px]">{settings.currencySymbol}</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500"
                                  placeholder="Cost..."
                                  value={batchPrices[key]?.costPrice || ''}
                                  onChange={(e) => handlePriceFieldChange(key, 'costPrice', e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Selling price</span>
                              <div className="relative w-28">
                                <span className="absolute left-2.5 inset-y-0 flex items-center font-bold text-slate-400 text-[10px]">{settings.currencySymbol}</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500"
                                  placeholder="Selling..."
                                  value={batchPrices[key]?.sellingPrice || ''}
                                  onChange={(e) => handlePriceFieldChange(key, 'sellingPrice', e.target.value)}
                                />
                              </div>
                            </div>

                            <button 
                              onClick={() => handleUpdateBatchPrice(batch._id, batch.batchNumber)}
                              className="px-3 py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm active:scale-95"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Apply to All Batches Section */}
                    <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl mt-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <div>
                          <h4 className="font-bold text-white flex items-center gap-2"><Sliders className="w-4 h-4 text-indigo-400"/> Bulk Batch Pricing Update</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Apply uniform cost & selling prices to all batches</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative w-24">
                            <span className="absolute left-2 inset-y-0 flex items-center font-bold text-slate-500 text-[10px]">{settings.currencySymbol}</span>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full pl-5 pr-2 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                              placeholder="All Cost"
                              value={globalCostInput}
                              onChange={(e) => setGlobalCostInput(e.target.value)}
                            />
                          </div>

                          <div className="relative w-24">
                            <span className="absolute left-2 inset-y-0 flex items-center font-bold text-slate-500 text-[10px]">{settings.currencySymbol}</span>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full pl-5 pr-2 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                              placeholder="All Sell"
                              value={globalSellInput}
                              onChange={(e) => setGlobalSellInput(e.target.value)}
                            />
                          </div>

                          <button 
                            onClick={handleApplyGlobalPrices}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm active:scale-95"
                          >
                            Apply All
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  // Global Stock Adjustment if no batches exist
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">Base Pricing</span>
                      <span className="text-xs font-bold text-slate-400 mt-1 block">Apply price changes to base stock.</span>
                    </div>

                    {/* Adjust Fields */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Cost price</span>
                        <div className="relative w-28">
                          <span className="absolute left-2.5 inset-y-0 flex items-center font-bold text-slate-400 text-[10px]">{settings.currencySymbol}</span>
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                            placeholder="Cost..."
                            value={batchPrices.base?.costPrice || ''}
                            onChange={(e) => handlePriceFieldChange('base', 'costPrice', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Selling price</span>
                        <div className="relative w-28">
                          <span className="absolute left-2.5 inset-y-0 flex items-center font-bold text-slate-400 text-[10px]">{settings.currencySymbol}</span>
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                            placeholder="Selling..."
                            value={batchPrices.base?.sellingPrice || ''}
                            onChange={(e) => handlePriceFieldChange('base', 'sellingPrice', e.target.value)}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => handleUpdateBatchPrice(null, null)}
                        className="px-4 py-2 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={closeAdjustmentModal} 
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

export default PriceManagement;
