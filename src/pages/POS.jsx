import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { printService } from '../utils/printService';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Coins, 
  Smartphone,
  CheckCircle2,
  X,
  User,
  Eraser,
  Wallet,
  Printer,
  Barcode,
  Monitor,
  RefreshCw,
  SearchCode,
  PackageSearch,
  ShoppingCart,
  UserPlus
} from 'lucide-react';

const POS = () => {
  const { confirm } = useConfirm();
  const { formatCurrency, settings } = useSettings();
  const { user } = useAuth();
  const toast = useToast();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const [cart, setCart] = useState([]);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  
  const [invoiceDate, setInvoiceDate] = useState(new Date().toLocaleString());
  const [billSerial, setBillSerial] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [discount, setDiscount] = useState(0);
  
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  // Split and Offline states
  const [splitAmounts, setSplitAmounts] = useState({
    cash: '',
    card: '',
    online: '',
    store_credit: ''
  });

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftFloatInput, setShiftFloatInput] = useState('0');
  
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerTitle, setNewCustomerTitle] = useState('Mr.');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);

  const searchInputRef = useRef(null);
  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const taxRate = (settings?.taxRate || 0) / 100;
  const calculatedTax = subTotal * taxRate;
  const netTotal = subTotal + calculatedTax - discount;
  const totalPayable = Math.round(netTotal);
  const roundOff = totalPayable - netTotal;
  const recAmountParsed = parseFloat(receivedAmount) || 0;
  const changeDue = recAmountParsed > totalPayable ? recAmountParsed - totalPayable : 0;

  const handleSplitAmountChange = (key, value) => {
    setSplitAmounts(prev => ({ ...prev, [key]: value }));
  };

  const cashSplit = parseFloat(splitAmounts.cash) || 0;
  const cardSplit = parseFloat(splitAmounts.card) || 0;
  const onlineSplit = parseFloat(splitAmounts.online) || 0;
  const storeCreditSplit = parseFloat(splitAmounts.store_credit) || 0;

  const totalAllocatedSplit = cashSplit + cardSplit + onlineSplit + storeCreditSplit;
  const remainingSplitToAllocate = Math.max(0, totalPayable - totalAllocatedSplit);



  useEffect(() => {
    fetchItems();
    fetchCustomers();
    generateBillSerial();
    checkActiveShift();
    


    const timer = setInterval(() => {
      setInvoiceDate(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, [success]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (success) {
        if (e.key === 'Enter') {
          e.preventDefault();
          triggerPrint();
          setSuccess(false);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSuccess(false);
        }
      } else if (showBatchModal && selectedItemForBatch) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const activeBatches = selectedItemForBatch.batches?.filter(b => b.status === 'active' && b.quantity > 0) || [];
          if (activeBatches.length > 0) {
            confirmBatchSelection(activeBatches[0]);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowBatchModal(false);
          setSelectedItemForBatch(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [success, showBatchModal, selectedItemForBatch, cart, paymentMethod, receivedAmount, discount, lastInvoice]);

  const checkActiveShift = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/shifts/active', config);
      if (!res.data) setIsShiftModalOpen(true);
    } catch (err) {
      setIsShiftModalOpen(true);
    }
  };
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/inventory', config);
      const activeItems = res.data.filter(i => i.status !== 'inactive');
      setItems(activeItems);
    } catch (err) {
      toast.error("Failed to synchronize catalog.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/customers?type=Customer', config);
      setCustomers(res.data);
    } catch (err) {}
  };

  const generateBillSerial = () => {
    const serial = 'INV-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    setBillSerial(serial);
  };

  const handleItemClick = (product) => {
    const activeBatches = product.batches?.filter(b => b.status === 'active' && b.quantity > 0) || [];
    if (activeBatches.length > 0 && settings.useBatchNumbers !== false) {
      setSelectedItemForBatch(product);
      setShowBatchModal(true);
      return;
    }
    addToCart(product);
  };

  const confirmBatchSelection = (batch) => {
    const batchedProduct = {
      ...selectedItemForBatch,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      price: batch.sellingPrice > 0 ? batch.sellingPrice : selectedItemForBatch.price,
      cartItemId: `${selectedItemForBatch._id}_${batch._id}`
    };
    addToCart(batchedProduct);
    setShowBatchModal(false);
    setSelectedItemForBatch(null);
  };

  const addToCart = (product) => {
    const identifier = product.cartItemId || product._id;
    const existing = cart.find(i => (i.cartItemId || i._id) === identifier);
    
    const maxQty = product.batchId 
      ? product.batches?.find(b => b._id === product.batchId)?.quantity || product.quantity 
      : product.quantity;

    if (existing) {
      if (existing.cartQuantity + 1 > maxQty) return toast.warning('Stock threshold reached.');
      setCart(cart.map(i => (i.cartItemId || i._id) === identifier ? { ...i, cartQuantity: i.cartQuantity + 1 } : i));
    } else {
      if (maxQty <= 0) return toast.error('Item is out of stock.');
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
    setSearchTerm('');
    setSearchResults([]);
    setSelectedItemIndex(-1);
    searchInputRef.current?.focus();
  };

  const updateQuantity = (identifier, delta) => {
    setCart(cart.map(i => {
      if ((i.cartItemId || i._id) === identifier) {
        const newQty = i.cartQuantity + delta;
        if (newQty <= 0) return i;
        
        const maxQty = i.batchId 
          ? i.batches?.find(b => b._id === i.batchId)?.quantity || i.quantity 
          : i.quantity;

        if (newQty > maxQty) {
          toast.warning('Exceeds available stock.');
          return i;
        }
        return { ...i, cartQuantity: newQty };
      }
      return i;
    }));
  };

  const removeFromCart = (identifier) => setCart(cart.filter(i => (i.cartItemId || i._id) !== identifier));
  const clearCart = () => setCart([]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setSelectedItemIndex(-1);
    if (val.length > 1) {
      const filtered = items.filter(i => 
        i.name.toLowerCase().includes(val.toLowerCase()) || 
        (i.barcode && i.barcode.toLowerCase().includes(val.toLowerCase())) ||
        (i.sku && i.sku.toLowerCase().includes(val.toLowerCase()))
      ).slice(0, 8);
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedItemIndex(prev => 
        searchResults.length > 0 ? (prev + 1) % searchResults.length : -1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedItemIndex(prev => 
        searchResults.length > 0 ? (prev - 1 + searchResults.length) % searchResults.length : -1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedItemIndex >= 0 && selectedItemIndex < searchResults.length) {
        handleItemClick(searchResults[selectedItemIndex]);
      } else {
        const exactMatch = items.find(i => 
          (i.barcode && i.barcode.toLowerCase() === searchTerm.toLowerCase()) || 
          (i.sku && i.sku.toLowerCase() === searchTerm.toLowerCase())
        );
        if (exactMatch) {
          handleItemClick(exactMatch);
        } else if (searchResults.length > 0) {
          handleItemClick(searchResults[0]);
        }
      }
    }
  };

  const handleReceivedAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!processing && cart.length > 0) {
        handleGetPayment();
      }
    }
  };

  const handleCustomerSearch = (e) => {
    setCustomerSearch(e.target.value);
    setShowCustomerDropdown(true);
    setSelectedCustomerIndex(-1);
  };

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
    setSelectedCustomerIndex(-1);
  };

  const filteredCustomers = customers.filter(c => 
    (c.category === 'Retail' || !c.category) && (
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    )
  ).slice(0, 5);

  const handleCustomerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCustomerIndex(prev => 
        filteredCustomers.length > 0 ? (prev + 1) % filteredCustomers.length : -1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCustomerIndex(prev => 
        filteredCustomers.length > 0 ? (prev - 1 + filteredCustomers.length) % filteredCustomers.length : -1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedCustomerIndex >= 0 && selectedCustomerIndex < filteredCustomers.length) {
        selectCustomer(filteredCustomers[selectedCustomerIndex]);
      } else if (filteredCustomers.length > 0) {
        selectCustomer(filteredCustomers[0]);
      }
    }
  };



  const handleGetPayment = async () => {
    if (cart.length === 0) return toast.info("No items in cart.");
    
    let salePayments = [];
    if (paymentMethod === 'split') {
      if (Math.round(totalAllocatedSplit) !== Math.round(totalPayable)) {
        return toast.error(`Total allocated split must match Net Total ${formatCurrency(totalPayable)}.`);
      }
      if (cashSplit > 0) salePayments.push({ method: 'cash', amount: cashSplit });
      if (cardSplit > 0) salePayments.push({ method: 'card', amount: cardSplit });
      if (onlineSplit > 0) salePayments.push({ method: 'online', amount: onlineSplit });
      if (storeCreditSplit > 0) salePayments.push({ method: 'store_credit', amount: storeCreditSplit });
    } else {
      if (paymentMethod === 'cash' && recAmountParsed < totalPayable) {
        return toast.error(`Insufficient cash received.`);
      }
      salePayments = [{ method: paymentMethod, amount: totalPayable }];
    }

    // Check if store credit exceeds available balance
    const storeCreditAmount = salePayments.find(p => p.method === 'store_credit')?.amount || 0;
    if (storeCreditAmount > 0) {
      if (!selectedCustomer) return toast.error("Customer link required for Store Credit checkouts.");
      const availableCredit = selectedCustomer.creditLimit - selectedCustomer.currentBalance;
      if (storeCreditAmount > availableCredit) {
        return toast.error(`Inadequate credit capacity. Available: ${formatCurrency(availableCredit)}`);
      }
    }

    setProcessing(true);
    
    const salePayload = {
      items: cart,
      paymentMethod,
      payments: salePayments,
      customerName: selectedCustomer ? selectedCustomer.name : (customerSearch || 'Walk-in Customer'),
      customerId: selectedCustomer ? selectedCustomer._id : null,
      subtotal: subTotal,
      tax: calculatedTax,
      discount,
      total: totalPayable
    };

    try {
      await axios.post('http://localhost:5000/api/sales', salePayload, config);
      
      setLastInvoice({
        serial: billSerial,
        date: invoiceDate,
        items: [...cart],
        customer: salePayload.customerName,
        paymentMethod,
        subtotal: subTotal,
        tax: calculatedTax,
        discount: discount,
        roundOff: roundOff,
        grandTotal: totalPayable,
        received: recAmountParsed,
        change: changeDue,
        cashier: user?.username || 'Admin',
        isOfflineQueued: false
      });

      setSuccess(true);
      toast.success("Transaction finalized.");
      setCart([]);
      setReceivedAmount('');
      setDiscount(0);
      setSplitAmounts({ cash: '', card: '', online: '', store_credit: '' });
      setSelectedCustomer(null);
      setCustomerSearch('');
      generateBillSerial();
      fetchItems(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failure or network error.');
    } finally {
      setProcessing(false);
    }
  };

  const triggerPrint = () => {
    if (!lastInvoice) return;
    printService.posReceipt(lastInvoice, settings);
  };

  const handleStartShift = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/shifts/open', { startFloat: parseFloat(shiftFloatInput) }, config);
      setIsShiftModalOpen(false);
      toast.success('Shift started.');
    } catch (err) { toast.error('Shift initialization failed.'); }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerName) return toast.error('Customer name required.');
    try {
      const res = await axios.post('http://localhost:5000/api/customers', { title: newCustomerTitle, name: newCustomerName, phone: newCustomerPhone, category: 'Retail', type: 'Customer' }, config);
      setCustomers([...customers, res.data]);
      selectCustomer(res.data);
      setShowAddCustomerModal(false);
      setNewCustomerTitle('Mr.');
      setNewCustomerName('');
      setNewCustomerPhone('');
      toast.success('Customer profile created.');
    } catch (err) {
      toast.error('Failed to create customer.');
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6 p-2">
      
      {/* Left Column: Inventory & Selection */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Advanced Search Bar */}
        <div className="relative z-20">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 group focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
            <div className="flex-1 relative">
              <Search className="absolute left-3 inset-y-0 my-auto h-5 w-5 text-slate-400 group-focus-within:text-blue-600" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Scan barcode or type item name..." 
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-0"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchItems} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="w-px h-8 bg-slate-200 mx-1"></div>
              <button onClick={clearCart} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                <Eraser className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Catalog Results</div>
              {searchResults.map((item, index) => (
                <button 
                  key={item._id} 
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between p-4 transition-colors border-b border-slate-50 last:border-0 ${
                    index === selectedItemIndex ? 'bg-blue-50 text-blue-900 border-l-4 border-l-blue-600' : 'hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><PackageSearch className="w-6 h-6"/></div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">{item.barcode || item.sku || 'No SKU'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{formatCurrency(item.price)}</p>
                    <p className={`text-[10px] font-bold uppercase ${item.quantity < 10 ? 'text-red-500' : 'text-emerald-500'}`}>{item.quantity} In Stock</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Cart Table */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Checkout Basket</h3>
            </div>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{cart.length} Unique Items</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4 text-center">Unit Price</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  <th className="px-6 py-4 text-right">Ext. Price</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cart.map((item) => (
                  <tr key={item.cartItemId || item._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 leading-none">{item.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 uppercase font-mono">{item.sku}</p>
                      {item.batchNumber && settings.useBatchNumbers !== false && (
                        <div className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase tracking-wider border border-blue-100">
                          Batch: {item.batchNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-600">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => updateQuantity(item.cartItemId || item._id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-all"><Minus className="w-4 h-4" /></button>
                        <span className="w-6 text-center font-bold text-slate-800">{item.cartQuantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId || item._id, 1)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-all"><Plus className="w-4 h-4" /></button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.price * item.cartQuantity)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => removeFromCart(item.cartItemId || item._id)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-32 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <Monitor className="w-20 h-20 text-slate-400" />
                        <p className="mt-4 font-bold uppercase tracking-[0.3em] text-sm">Cart is empty</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Billing & Actions */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6">
        
        {/* Customer Intelligence */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-visible">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-800">Customer Link</h4>
          </div>
          <div className="relative">
            <input 
              type="text" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              placeholder="Search or enter name..."
              value={customerSearch}
              onChange={handleCustomerSearch}
              onKeyDown={handleCustomerKeyDown}
              onFocus={() => { setShowCustomerDropdown(true); setSelectedCustomerIndex(-1); }}
            />
            <button onClick={() => { setShowAddCustomerModal(true); setNewCustomerPhone(customerSearch); }} className="absolute right-2 top-2 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600"><UserPlus className="w-4 h-4"/></button>
            {showCustomerDropdown && customerSearch.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                {filteredCustomers.map((c, index) => (
                  <button 
                    key={c._id} 
                    onClick={() => selectCustomer(c)} 
                    className={`w-full p-3 text-left flex flex-col border-b last:border-0 border-slate-100 transition-colors ${
                      index === selectedCustomerIndex ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-blue-50/50'
                    }`}
                  >
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedCustomer && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1.5 animate-in fade-in duration-300">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <span>Loyalty Tier</span>
                <span className="text-blue-700">{selectedCustomer.loyaltyTier || 'Bronze'}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <span>Available Credit Limit</span>
                <span className="text-emerald-700">{formatCurrency(selectedCustomer.creditLimit - selectedCustomer.currentBalance)}</span>
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-4">
            <span>Terminal Date</span>
            <span className="text-slate-800">{invoiceDate}</span>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="flex-1 bg-slate-900 rounded-3xl p-8 flex flex-col shadow-2xl shadow-slate-900/40 relative overflow-y-auto custom-scrollbar group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-3">
             <Coins className="w-4 h-4 text-blue-500" /> Settlement
          </h3>
          
          <div className="space-y-5 mb-10 flex-1">
            <SummaryRow label="Gross Subtotal" value={formatCurrency(subTotal)} />
            <SummaryRow label={`Taxation (${settings?.taxRate || 0}%)`} value={formatCurrency(calculatedTax)} />
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Adjustments / Discount</span>
              <div className="flex items-center">
                <span className="text-red-400 font-bold mr-1">-</span>
                <input 
                  type="number" 
                  className="w-20 bg-slate-800 border border-slate-700 text-red-400 font-bold text-right rounded px-2 py-1 focus:outline-none focus:border-blue-500" 
                  value={discount} 
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Net Total Payable</p>
                <h2 className="text-4xl font-bold text-white tracking-tighter">{formatCurrency(totalPayable)}</h2>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-bold text-slate-500 uppercase">Round Off</p>
                 <p className="text-xs font-bold text-slate-400">{formatCurrency(roundOff)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tender Method</p>
              <div className="grid grid-cols-5 gap-1">
                <TenderBtn icon={<Coins />} label="Cash" active={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} />
                <TenderBtn icon={<CreditCard />} label="Card" active={paymentMethod === 'card'} onClick={() => setPaymentMethod('card')} />
                <TenderBtn icon={<Smartphone />} label="NFC" active={paymentMethod === 'online'} onClick={() => setPaymentMethod('online')} />
                <TenderBtn 
                  icon={<Wallet />} 
                  label="Wallet" 
                  active={paymentMethod === 'store_credit'} 
                  onClick={() => {
                    if (!selectedCustomer) return toast.info("Link a customer to pay with Store Credit.");
                    setPaymentMethod('store_credit');
                  }} 
                />
                <TenderBtn icon={<Smartphone />} label="Split" active={paymentMethod === 'split'} onClick={() => setPaymentMethod('split')} />
              </div>
            </div>

            {paymentMethod === 'split' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Split Amounts</p>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase">Cash Amount</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-blue-500"
                      value={splitAmounts.cash}
                      onChange={(e) => handleSplitAmountChange('cash', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase">Card Amount</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-blue-500"
                      value={splitAmounts.card}
                      onChange={(e) => handleSplitAmountChange('card', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase">Online / NFC</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-blue-500"
                      value={splitAmounts.online}
                      onChange={(e) => handleSplitAmountChange('online', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase">Store Credit</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      disabled={!selectedCustomer}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-50"
                      value={splitAmounts.store_credit}
                      onChange={(e) => handleSplitAmountChange('store_credit', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2">
                  <span>Total Allocated: {formatCurrency(totalAllocatedSplit)}</span>
                  <span className={Math.round(totalAllocatedSplit) === Math.round(totalPayable) ? "text-emerald-400" : "text-amber-400"}>
                    {Math.round(totalAllocatedSplit) === Math.round(totalPayable) ? "Fully Allocated" : `Remaining: ${formatCurrency(remainingSplitToAllocate)}`}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Amount Tendered</p>
                <div className="relative">
                  <span className="absolute left-4 inset-y-0 flex items-center font-bold text-slate-500 text-lg">$</span>
                  <input 
                    type="number" 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-2xl font-bold text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-800"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    onKeyDown={handleReceivedAmountKeyDown}
                    placeholder="0.00"
                  />
                </div>
                <div className="mt-4 flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-500/60 uppercase">Change Due</span>
                  <span className="text-xl font-bold text-emerald-400">{formatCurrency(changeDue)}</span>
                </div>
              </div>
            )}

            <button 
              onClick={handleGetPayment}
              disabled={processing || cart.length === 0}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold uppercase text-xs tracking-[0.2em] rounded-xl shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
            >
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Finalize Bill
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {success && lastInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Bill Generated</h3>
              {lastInvoice.isOfflineQueued && (
                <div className="mt-2 px-3 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg">
                  Offline Mode: Queued to browser cache
                </div>
              )}
              <p className="text-sm text-slate-500 mt-2 font-medium">Invoice <span className="font-bold text-blue-600">{lastInvoice.serial}</span> finalized for {lastInvoice.customer}.</p>
              
              <div className="mt-10 grid grid-cols-1 gap-3">
                <button onClick={triggerPrint} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
                  <Printer className="w-5 h-5" /> Print Thermal Receipt
                </button>
                <button onClick={() => setSuccess(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">
                  Return to Terminal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Initialization Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-3xl p-10 text-center animate-in slide-in-from-bottom-10 duration-500">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-lg">
              <Wallet className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Shift Control</h3>
            <p className="text-sm text-slate-400 mt-2 mb-10 font-medium">Please enter the opening cash float balance to start your shift.</p>
            
            <form onSubmit={handleStartShift} className="space-y-8 text-left">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3 tracking-widest pl-1">Opening Cash Float</label>
                <div className="relative group">
                  <span className="absolute left-5 inset-y-0 flex items-center font-bold text-slate-300 text-xl group-focus-within:text-blue-500 transition-colors">$</span>
                  <input 
                    type="number" 
                    className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                    value={shiftFloatInput}
                    onChange={(e) => setShiftFloatInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-500 transition-all active:scale-95">
                Start Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[24px] shadow-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">New Customer Link</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Customer Name</label>
                <div className="flex gap-2">
                  <select 
                    className="w-24 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    value={newCustomerTitle}
                    onChange={e => setNewCustomerTitle(e.target.value)}
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Rev.">Rev.</option>
                    <option value="Prof.">Prof.</option>
                    <option value="">None</option>
                  </select>
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    placeholder="Full Name"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Phone / Mobile</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md mt-2">
                Register Customer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Batch Selection Modal */}
      {showBatchModal && selectedItemForBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Select Batch for Sale</h3>
                <p className="text-xs text-slate-400">{selectedItemForBatch.name}</p>
              </div>
              <button onClick={() => { setShowBatchModal(false); setSelectedItemForBatch(null); }} className="hover:text-slate-300"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-6 bg-slate-50 overflow-auto max-h-[60vh]">
              <div className="grid grid-cols-1 gap-4">
                {selectedItemForBatch.batches.filter(b => b.status === 'active' && b.quantity > 0).map(batch => (
                  <div 
                    key={batch._id} 
                    onClick={() => confirmBatchSelection(batch)}
                    className="bg-white border border-slate-200 p-4 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-black text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors">Batch: {batch.batchNumber}</h4>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Exp: {new Date(batch.expiryDate).toLocaleDateString()}</span>
                        <span>Stock: <span className="text-blue-600">{batch.quantity}</span></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selling Price</p>
                      <p className="text-xl font-black text-slate-900">{formatCurrency(batch.sellingPrice > 0 ? batch.sellingPrice : selectedItemForBatch.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const SummaryRow = ({ label, value, color = "text-slate-400" }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{label}</span>
    <span className={`font-bold ${color}`}>{value}</span>
  </div>
);

const TenderBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
    active ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
  }`}>
    <span className="mb-2">{icon}</span>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default POS;
