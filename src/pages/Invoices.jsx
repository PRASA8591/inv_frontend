import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { printService } from '../utils/printService';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Trash2, 
  Save, 
  FileCheck, 
  X, 
  Printer,
  AlertCircle,
  Briefcase,
  Layers,
  Activity,
  History
} from 'lucide-react';

const Invoices = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { formatCurrency, settings } = useSettings();
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin' && !user?.access?.invoices_edit;

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 15');
  const [dueDate, setDueDate] = useState('');
  const [builderNotes, setBuilderNotes] = useState('');
  const [builderItems, setBuilderItems] = useState([]); 

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const itemDropdownRef = useRef(null);

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const loadInvoicingData = async () => {
    setLoading(true);
    try {
      const [invRes, custRes, itRes] = await Promise.all([
        axios.get('http://localhost:5000/api/invoices', config),
        axios.get('http://localhost:5000/api/customers?type=Seller', config),
        axios.get('http://localhost:5000/api/inventory', config)
      ]);
      setInvoices(invRes.data);
      setCustomers(custRes.data);
      const activeItems = itRes.data.filter(i => i.status !== 'inactive');
      setCatalogItems(activeItems);
    } catch (err) {
      toast.error('Failed to load invoicing data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoicingData();
    const defDate = new Date();
    defDate.setDate(defDate.getDate() + 15);
    setDueDate(defDate.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target)) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const addToInvoiceWorkspace = (itemId) => {
    const product = catalogItems.find(i => i._id === itemId);
    if (!product) return;
    if (builderItems.some(i => i.itemId === itemId)) return toast.info('Item already added.');

    const activeBatches = (product.batches || []).filter(b => b.status === 'active' && b.quantity > 0);
    const selectedBatch = activeBatches.length > 0 ? activeBatches[0] : null;

    setBuilderItems([...builderItems, {
      itemId: product._id,
      name: product.name,
      quantity: 1,
      costPrice: selectedBatch ? selectedBatch.costPrice : (product.movingAverageCost || 0),
      price: selectedBatch ? selectedBatch.sellingPrice : product.price,
      sellingPrice: selectedBatch ? selectedBatch.sellingPrice : product.price,
      batchNumber: selectedBatch ? selectedBatch.batchNumber : '',
      expiryDate: selectedBatch ? selectedBatch.expiryDate : null,
      taxRate: product.taxBracket || 0,
      batches: product.batches || []
    }]);
  };

  const updateWorkspaceQty = (index, val) => {
    const upd = [...builderItems];
    const qty = parseInt(val) || 1;
    if (upd[index].batchNumber) {
      const selectedBatch = upd[index].batches.find(b => b.batchNumber === upd[index].batchNumber);
      if (selectedBatch && qty > selectedBatch.quantity) {
        toast.warning(`Quantity exceeds available batch stock of ${selectedBatch.quantity}.`);
        upd[index].quantity = selectedBatch.quantity;
        setBuilderItems(upd);
        return;
      }
    }
    upd[index].quantity = qty;
    setBuilderItems(upd);
  };

  const handleBatchChange = (index, batchNo) => {
    const upd = [...builderItems];
    const selectedBatch = upd[index].batches.find(b => b.batchNumber === batchNo);
    if (selectedBatch) {
      upd[index].batchNumber = batchNo;
      upd[index].expiryDate = selectedBatch.expiryDate;
      upd[index].costPrice = selectedBatch.costPrice;
      upd[index].price = selectedBatch.sellingPrice;
      upd[index].sellingPrice = selectedBatch.sellingPrice;
      if (upd[index].quantity > selectedBatch.quantity) {
        upd[index].quantity = selectedBatch.quantity || 1;
      }
    } else {
      upd[index].batchNumber = '';
      upd[index].expiryDate = null;
    }
    setBuilderItems(upd);
  };

  const removeBuilderItem = (index) => {
    setBuilderItems(builderItems.filter((_, i) => i !== index));
  };

  const builderSubtotal = builderItems.reduce((sum, i) => sum + (i.quantity * (settings.useCostPrice !== false ? i.costPrice : i.price)), 0);
  const builderTaxTotal = builderItems.reduce((sum, i) => sum + ((i.quantity * (settings.useCostPrice !== false ? i.costPrice : i.price)) * (i.taxRate || 0) / 100), 0);
  const builderGrandTotal = builderSubtotal + builderTaxTotal;

  const handlePublishInvoice = async (e, customStatus = 'draft') => {
    e?.preventDefault();
    if (builderItems.length === 0) return toast.error('No items added.');
    if (!selectedCustomerId) return toast.error('Please select a seller.');

    let confirmTitle = '';
    let confirmMsg = '';
    let confirmBtn = '';
    let confirmType = 'info';

    if (customStatus === 'draft') {
      confirmTitle = 'Save Invoice as Draft?';
      confirmMsg = 'Are you sure you want to save this commercial invoice as a DRAFT? Inventory stock levels will not be adjusted yet.';
      confirmBtn = 'Save as Draft';
      confirmType = 'info';
    } else if (customStatus === 'completed') {
      confirmTitle = 'Complete Commercial Invoice?';
      confirmMsg = 'Are you sure you want to COMPLETE this commercial invoice? This will formalize the document, deduct catalog stock immediately, and update the customer receivable balance.';
      confirmBtn = 'Complete Invoice';
      confirmType = 'warning';
    } else if (customStatus === 'paid') {
      confirmTitle = 'Finalize & Mark Paid?';
      confirmMsg = 'Are you sure you want to save and mark this commercial invoice as fully PAID? This will formalize the document, deduct catalog stock immediately, and keep customer receivables balanced.';
      confirmBtn = 'Finalize & Pay';
      confirmType = 'warning';
    }

    const confirmed = await confirm({
      title: confirmTitle,
      message: confirmMsg,
      confirmText: confirmBtn,
      type: confirmType
    });

    if (!confirmed) return;

    try {
      await axios.post('http://localhost:5000/api/invoices', {
        customerId: selectedCustomerId,
        items: builderItems,
        paymentTerms,
        dueDate,
        notes: builderNotes,
        status: customStatus
      }, config);
      toast.success(`Invoice created as ${customStatus.toUpperCase()} successfully.`);
      setIsBuilderOpen(false);
      setSelectedCustomerId('');
      setBuilderItems([]);
      setBuilderNotes('');
      loadInvoicingData();
    } catch (err) { toast.error('Failed to create invoice.'); }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    let confirmTitle = '';
    let confirmMsg = '';
    let confirmBtn = '';
    let confirmType = 'warning';

    if (newStatus === 'completed') {
      confirmTitle = 'Mark Invoice as Completed?';
      confirmMsg = 'Are you sure you want to transition this invoice to COMPLETED? This will formalize the document, deduct warehouse item quantities, and record customer receivable balances.';
      confirmBtn = 'Mark Completed';
    } else if (newStatus === 'paid') {
      confirmTitle = 'Mark Invoice as Fully Paid?';
      confirmMsg = 'Are you sure you want to mark this invoice as fully PAID? This will transition the status and reconcile outstanding customer receivable balances.';
      confirmBtn = 'Mark Paid';
    }

    const confirmed = await confirm({
      title: confirmTitle,
      message: confirmMsg,
      confirmText: confirmBtn,
      type: confirmType
    });

    if (!confirmed) return;

    try {
      await axios.put(`http://localhost:5000/api/invoices/${id}/status`, { status: newStatus }, config);
      toast.success(`Invoice status updated to ${newStatus.toUpperCase()} successfully.`);
      loadInvoicingData();
    } catch (err) { toast.error('Failed to update status.'); }
  };

  const handlePrintInvoice = (inv) => {
    printService.a4Document({
      title: 'Invoice', docNumber: inv.invoiceNumber, date: new Date(inv.invoiceDate).toLocaleDateString(),
      partyLabel: 'BILL TO', partyDetails: { name: inv.customerDetails?.name, email: inv.customerDetails?.email, phone: inv.customerDetails?.phone },
      items: inv.items.map(i => ({
        name: i.name,
        qty: i.quantity,
        price: settings.useCostPrice !== false ? (i.costPrice || i.price) : (i.sellingPrice || i.price),
        tax: i.taxRate,
        total: (i.quantity * (settings.useCostPrice !== false ? (i.costPrice || i.price) : (i.sellingPrice || i.price))) * (1 + (i.taxRate || 0) / 100),
        batch: settings.useBatchNumbers !== false ? i.batchNumber : '',
        expiry: i.expiryDate && settings.useExpirationDates !== false ? new Date(i.expiryDate).toLocaleDateString() : '',
        costPrice: i.costPrice
      })),
      summaryFields: [{ label: 'Subtotal', value: inv.subtotal }, { label: 'Tax', value: inv.taxTotal }, { label: 'TOTAL', value: inv.grandTotal, isGrand: true }],
      badge: inv.status.toUpperCase(),
      settings
    });
  };

  const downloadExcelReport = () => {
    if (filteredInvoices.length === 0) {
      return toast.info('No data available to export.');
    }

    // Build CSV Content
    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Invoice Date',
      'Due Date',
      'Subtotal',
      'Tax Total',
      'Discount',
      'Grand Total',
      'Status'
    ];

    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.customerDetails?.name || 'Walk-In',
      inv.customerDetails?.email || '',
      inv.customerDetails?.phone || '',
      new Date(inv.invoiceDate).toLocaleDateString(),
      new Date(inv.dueDate).toLocaleDateString(),
      inv.subtotal,
      inv.taxTotal,
      inv.discountTotal || 0,
      inv.grandTotal,
      inv.status.toUpperCase()
    ]);

    // Escape values and join
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename based on filters if active
    let filename = 'Invoices_Report';
    if (fromDate) filename += `_from_${fromDate}`;
    if (toDate) filename += `_to_${toDate}`;
    filename += '.csv';

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Excel Report downloaded successfully!');
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (inv.customerDetails?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    // Apply Date Range Filter
    let matchesDate = true;
    const invDateStr = inv.invoiceDate.split('T')[0]; // Format: YYYY-MM-DD
    if (fromDate && invDateStr < fromDate) matchesDate = false;
    if (toDate && invDateStr > toDate) matchesDate = false;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-blue-600 flex items-center justify-center text-white">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
            <p className="text-sm text-slate-500">Manage B2B billings and accounts receivable.</p>
          </div>
        </div>
        
        {!readOnly && (
          <button 
            onClick={() => setIsBuilderOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-md shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sales" value={formatCurrency(invoices.reduce((sum, i) => sum + i.grandTotal, 0))} icon={<Layers className="w-5 h-5"/>} color="blue" />
        <StatCard label="Outstanding" value={formatCurrency(invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.grandTotal, 0))} icon={<Activity className="w-5 h-5"/>} color="amber" />
        <StatCard label="Overdue" value={invoices.filter(i => i.status === 'overdue').length} icon={<AlertCircle className="w-5 h-5"/>} color="red" />
        <StatCard label="Total Invoices" value={invoices.length} icon={<History className="w-5 h-5"/>} color="slate" />
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by invoice # or seller..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-200 p-1 rounded-lg self-start">
              {['all', 'draft', 'completed', 'paid'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                    statusFilter === f 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200/60">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">From:</span>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">To:</span>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded font-bold transition-all shadow-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <button
              onClick={downloadExcelReport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md shadow-sm text-xs transition-all active:scale-95 self-start sm:self-auto uppercase tracking-wider"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel Report ({filteredInvoices.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Seller</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setViewingInvoice(inv)}>
                  <td className="px-6 py-4 font-bold text-slate-800 text-sm">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">{inv.customerDetails?.name || 'Guest'}</p>
                    <p className="text-[10px] text-slate-400">{inv.customerDetails?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(inv.grandTotal)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                      inv.status === 'paid' ? 'bg-green-50 text-green-600 border-green-200' : 
                      inv.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                      inv.status === 'draft' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handlePrintInvoice(inv)} className="p-1.5 text-slate-400 hover:text-blue-600 border border-slate-200 rounded hover:bg-blue-50">
                        <Printer className="w-4 h-4"/>
                      </button>
                      {inv.status === 'draft' && (
                        <>
                          <button onClick={() => handleUpdateStatus(inv._id, 'completed')} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold">
                            Complete
                          </button>
                          <button onClick={() => handleUpdateStatus(inv._id, 'paid')} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold">
                            Paid
                          </button>
                        </>
                      )}
                      {inv.status === 'completed' && (
                        <button onClick={() => handleUpdateStatus(inv._id, 'paid')} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold">
                          Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <h3 className="font-bold">New Invoice Builder</h3>
              <button onClick={() => setIsBuilderOpen(false)}><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Seller</label>
                  <select value={selectedCustomerId} onChange={(e)=>setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm bg-white">
                    <option value="">Select seller...</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Terms</label>
                  <select value={paymentTerms} onChange={(e)=>setPaymentTerms(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm bg-white">
                    <option value="Due on receipt">Immediate</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>
                 <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                  <div className="flex gap-1 mt-1.5 overflow-x-auto pb-1">
                    {[7, 15, 30, 45, 60].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          const base = new Date();
                          base.setDate(base.getDate() + days);
                          setDueDate(base.toISOString().split('T')[0]);
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-[10px] font-bold text-slate-600 transition-colors whitespace-nowrap"
                      >
                        +{days}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative" ref={itemDropdownRef}>
                <div 
                  onClick={() => setIsItemDropdownOpen(true)}
                  className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-slate-500 font-medium">
                    {itemSearchQuery ? `Searching: "${itemSearchQuery}"` : '+ Click to search and add item from catalog...'}
                  </span>
                  <Search className="w-4 h-4 text-slate-400" />
                </div>

                {isItemDropdownOpen && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 flex flex-col">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        placeholder="Type item name, SKU or barcode to search..."
                        className="w-full text-xs p-1.5 focus:outline-none bg-slate-50 rounded"
                        autoFocus
                      />
                      {itemSearchQuery && (
                        <button onClick={() => setItemSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {catalogItems.filter(i => 
                        i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || 
                        (i.sku && i.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())) ||
                        (i.barcode && i.barcode.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                      ).length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No items found matching "{itemSearchQuery}"</div>
                      ) : (
                        catalogItems.filter(i => 
                          i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || 
                          (i.sku && i.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())) ||
                          (i.barcode && i.barcode.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                        ).map(i => (
                          <div 
                            key={i._id}
                            onClick={() => {
                              addToInvoiceWorkspace(i._id);
                              setItemSearchQuery('');
                              setIsItemDropdownOpen(false);
                            }}
                            className="p-3 text-xs hover:bg-blue-50 border-b border-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{i.name}</div>
                              <div className="text-[10px] text-slate-400">SKU: {i.sku || 'N/A'}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-700">{formatCurrency(i.price)}</span>
                              <div className="text-[10px] text-slate-400">Stock: {i.quantity || 0}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-md overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left w-1/4">Item</th>
                      {settings.useBatchNumbers !== false && <th className="p-3 text-left w-40">Batch</th>}
                      <th className="p-3 text-center w-20">Qty</th>
                      {settings.useCostPrice !== false && <th className="p-3 text-right w-28">Cost Price</th>}
                      <th className="p-3 text-right w-28">Selling Price</th>
                      <th className="p-3 text-right w-20">Tax%</th>
                      <th className="p-3 text-right w-28">Total</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builderItems.map((b, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="p-3 font-bold w-1/4 truncate" title={b.name}>{b.name}</td>
                        {settings.useBatchNumbers !== false && (
                          <td className="p-3 w-40">
                            <select
                              value={b.batchNumber}
                              onChange={(e) => handleBatchChange(idx, e.target.value)}
                              className="w-full p-1 border border-slate-300 rounded text-xs bg-white focus:outline-none"
                            >
                              <option value="">No Batch</option>
                              {(b.batches || []).filter(bt => bt.status === 'active' && bt.quantity > 0).map(bt => {
                                const expStr = bt.expiryDate && settings.useExpirationDates !== false ? new Date(bt.expiryDate).toLocaleDateString() : 'No Exp';
                                return (
                                  <option key={bt.batchNumber} value={bt.batchNumber}>
                                    {bt.batchNumber} (Stock: {bt.quantity} | Exp: {expStr})
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                        )}
                        <td className="p-3 text-center w-20">
                          <input type="number" min="1" value={b.quantity} onChange={(e)=>updateWorkspaceQty(idx, e.target.value)} className="w-16 p-1 border text-center rounded"/>
                        </td>
                        {settings.useCostPrice !== false && (
                          <td className="p-3 w-28">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400 text-xs">{settings.currencySymbol || 'Rs.'}</span>
                              <input
                                type="number"
                                step="0.01"
                                value={b.costPrice}
                                onChange={(e) => {
                                  const u = [...builderItems];
                                  u[idx].costPrice = parseFloat(e.target.value) || 0;
                                  setBuilderItems(u);
                                }}
                                className="w-20 p-1 border border-slate-300 rounded text-right text-xs"
                              />
                            </div>
                          </td>
                        )}
                        <td className="p-3 w-28">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 text-xs">{settings.currencySymbol || 'Rs.'}</span>
                            <input
                              type="number"
                              step="0.01"
                              value={b.price}
                              onChange={(e) => {
                                const u = [...builderItems];
                                const val = parseFloat(e.target.value) || 0;
                                u[idx].price = val;
                                u[idx].sellingPrice = val;
                                setBuilderItems(u);
                              }}
                              className="w-20 p-1 border border-slate-300 rounded text-right text-xs font-bold text-blue-600"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right w-20">
                          <input type="number" value={b.taxRate} onChange={(e) => { const u=[...builderItems]; u[idx].taxRate=parseInt(e.target.value); setBuilderItems(u); }} className="w-12 p-1 border text-center rounded"/>
                        </td>
                        <td className="p-3 text-right font-bold w-28">
                          {formatCurrency((b.quantity * (settings.useCostPrice !== false ? b.costPrice : b.price)) * (1 + b.taxRate/100))}
                        </td>
                        <td className="p-3 text-center w-12">
                          <button onClick={()=>removeBuilderItem(idx)} className="p-1 hover:bg-slate-100 rounded">
                            <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700"/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-start gap-8">
                <textarea value={builderNotes} onChange={(e)=>setBuilderNotes(e.target.value)} placeholder="Invoice notes..." className="flex-1 p-3 border border-slate-300 rounded text-sm h-24"></textarea>
                <div className="w-64 bg-slate-800 p-4 rounded text-white space-y-2">
                  <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span>{formatCurrency(builderSubtotal)}</span></div>
                  <div className="flex justify-between text-xs text-slate-400"><span>Tax</span><span>{formatCurrency(builderTaxTotal)}</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-slate-700"><span>Grand Total</span><span>{formatCurrency(builderGrandTotal)}</span></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end items-center gap-3">
              <button type="button" onClick={() => setIsBuilderOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
              <div className="flex gap-2">
                <button type="button" onClick={(e) => handlePublishInvoice(e, 'draft')} className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded font-bold text-sm">
                  Save as Draft
                </button>
                <button type="button" onClick={(e) => handlePublishInvoice(e, 'completed')} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded font-bold text-sm">
                  Complete (Unpaid)
                </button>
                <button type="button" onClick={(e) => handlePublishInvoice(e, 'paid')} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded font-bold text-sm">
                  Complete & Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4" onClick={() => setViewingInvoice(null)}>
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <h3 className="font-bold">Invoice Details: {viewingInvoice.invoiceNumber}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrintInvoice(viewingInvoice)} className="p-1.5 hover:bg-slate-700 rounded"><Printer className="w-5 h-5"/></button>
                <button onClick={() => setViewingInvoice(null)}><X className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Seller</p>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                    <p className="font-bold text-slate-800">{viewingInvoice.customerDetails?.name}</p>
                    <p className="text-sm text-slate-500">{viewingInvoice.customerDetails?.email}</p>
                    <p className="text-sm text-slate-500">{viewingInvoice.customerDetails?.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs font-bold text-slate-400 uppercase">Date</p><p className="font-bold">{new Date(viewingInvoice.invoiceDate).toLocaleDateString()}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase">Terms</p><p className="font-bold">{viewingInvoice.paymentTerms}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase">Status</p><p className="font-bold uppercase text-blue-600">{viewingInvoice.status}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase">Due Date</p><p className="font-bold text-red-600">{new Date(viewingInvoice.dueDate).toLocaleDateString()}</p></div>
                </div>
              </div>

              <table className="w-full text-sm border border-slate-100 rounded overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left">Item</th>
                    {settings.useBatchNumbers !== false && <th className="p-3 text-left">Batch</th>}
                    <th className="p-3 text-center">Qty</th>
                    {settings.useCostPrice !== false && <th className="p-3 text-right">Cost Price</th>}
                    <th className="p-3 text-right">Selling Price</th>
                    <th className="p-3 text-right">Tax</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="p-3 font-bold">{item.name}</td>
                      {settings.useBatchNumbers !== false && (
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-600 self-start font-bold">
                              {item.batchNumber || 'N/A'}
                            </span>
                            {item.expiryDate && settings.useExpirationDates !== false && (
                              <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                Exp: {new Date(item.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="p-3 text-center">{item.quantity}</td>
                      {settings.useCostPrice !== false && <td className="p-3 text-right text-xs text-slate-500">{formatCurrency(item.costPrice || 0)}</td>}
                      <td className="p-3 text-right text-xs font-bold text-blue-600">{formatCurrency(item.sellingPrice || item.price || 0)}</td>
                      <td className="p-3 text-right">{item.taxRate}%</td>
                      <td className="p-3 text-right font-bold">
                        {formatCurrency((item.quantity * (settings.useCostPrice !== false ? (item.costPrice || 0) : (item.sellingPrice || item.price || 0))) * (1 + item.taxRate/100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-800 p-6 rounded text-white flex justify-between items-end">
                <div className="text-xs text-slate-400 italic">Notes: {viewingInvoice.notes || 'No notes.'}</div>
                <div className="w-48 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span>{formatCurrency(viewingInvoice.subtotal)}</span></div>
                  <div className="flex justify-between text-xs text-slate-400"><span>Tax</span><span>{formatCurrency(viewingInvoice.taxTotal)}</span></div>
                  <div className="flex justify-between font-bold text-xl pt-2 border-t border-slate-700"><span>Total</span><span>{formatCurrency(viewingInvoice.grandTotal)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200"
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 select-none hover:-translate-y-0.5 transition-all">
      <div className={`p-2.5 rounded-lg border ${colors[color]} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-base sm:text-lg font-black text-slate-800 mt-0.5 tracking-tight truncate" title={value}>{value}</p>
      </div>
    </div>
  );
};

export default Invoices;
