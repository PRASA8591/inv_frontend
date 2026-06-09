import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { printService } from '../utils/printService';
import { 
  Truck, 
  ClipboardList, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle2, 
  X, 
  Trash2, 
  RefreshCw,
  PackageCheck,
  Printer,
  Edit2,
  ShieldCheck,
  FileEdit,
  Save,
  ChevronRight,
  Package,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const SupplyChain = () => {
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin' && !user?.access?.supply_edit;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { formatCurrency, settings } = useSettings();
  const { subpage, docNumber } = useParams();
  const navigate = useNavigate();
  
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [returns, setReturns] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // View states
  const [viewingPO, setViewingPO] = useState(null);
  const [viewingGRN, setViewingGRN] = useState(null);
  const [viewingReturn, setViewingReturn] = useState(null);

  // Form states - PO
  const [poSupplier, setPoSupplier] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItemsWorkspace, setPoItemsWorkspace] = useState([]);
  const [editingPoId, setEditingPoId] = useState(null);
  
  // Form states - GRN
  const [grnPoRef, setGrnPoRef] = useState('');
  const [grnSupplier, setGrnSupplier] = useState('');
  const [grnNotes, setGrnNotes] = useState('');
  const [grnItemsWorkspace, setGrnItemsWorkspace] = useState([]);

  // Form states - Return
  const [returnGrnRef, setReturnGrnRef] = useState('');
  const [returnSupplier, setReturnSupplier] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnReason, setReturnReason] = useState('Damaged');
  const [returnItemsWorkspace, setReturnItemsWorkspace] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const loadCoreData = async () => {
    setLoading(true);
    try {
      const [posRes, grnRes, itemsRes, returnsRes, suppliersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/supply/po', config),
        axios.get('http://localhost:5000/api/supply/grn', config),
        axios.get('http://localhost:5000/api/inventory', config),
        axios.get('http://localhost:5000/api/supply/returns', config),
        axios.get('http://localhost:5000/api/customers?type=Supplier', config)
      ]);
      setPurchaseOrders(posRes.data);
      setGrns(grnRes.data);
      const activeItems = itemsRes.data.filter(i => i.status !== 'inactive');
      setCatalogItems(activeItems);
      setReturns(returnsRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (err) {
      toast.error('Data synchronization failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoreData();
  }, []);

  useEffect(() => {
    if (docNumber) {
      if (subpage === 'purchaseorder' && purchaseOrders.length > 0) {
        const po = purchaseOrders.find(p => p.poNumber === docNumber);
        if (po) setViewingPO(po);
      } else if (subpage === 'grn' && grns.length > 0) {
        const grn = grns.find(g => g.grnNumber === docNumber);
        if (grn) setViewingGRN(grn);
      } else if (subpage === 'return' && returns.length > 0) {
        const rtn = returns.find(r => r.returnNumber === docNumber);
        if (rtn) setViewingReturn(rtn);
      }
    } else {
      setViewingPO(null);
      setViewingGRN(null);
      setViewingReturn(null);
    }
  }, [docNumber, subpage, purchaseOrders, grns, returns]);

  // --- Purchase Order Logic ---
  const addProductToPO = (itemId) => {
    const product = catalogItems.find(i => i._id === itemId);
    if (!product) return;
    if (poItemsWorkspace.some(p => p.itemId === itemId)) return toast.info('Item already in workspace.');
    setPoItemsWorkspace([...poItemsWorkspace, {
      itemId: product._id, name: product.name, sku: product.sku, quantityOrdered: 1,
      estimatedCost: product.movingAverageCost || Math.round(product.price * 0.7)
    }]);
  };

  const handleCreatePO = async (statusType = 'pending_approval') => {
    if (poItemsWorkspace.length === 0) return toast.error('Add items to order.');
    if (!poSupplier.trim()) return toast.error('Supplier name is required.');
    try {
      if (editingPoId) {
        await axios.put(`http://localhost:5000/api/supply/po/${editingPoId}`, {
          supplier: poSupplier, items: poItemsWorkspace, notes: poNotes, status: statusType
        }, config);
      } else {
        await axios.post('http://localhost:5000/api/supply/po', {
          supplier: poSupplier, items: poItemsWorkspace, notes: poNotes, status: statusType
        }, config);
      }
      setIsPOModalOpen(false);
      setPoItemsWorkspace([]);
      setPoSupplier('');
      setPoNotes('');
      setEditingPoId(null);
      loadCoreData();
      toast.success(statusType === 'draft' ? 'Draft saved.' : 'Purchase Order submitted for approval.');
    } catch (err) { toast.error('Failed to save PO.'); }
  };

  const handleApprovePO = async (id) => {
    const isConfirmed = await confirm({
      title: 'Execute PO Approval?',
      message: 'Approving this order will authorize it for stock intake (GRN). This action is recorded.',
      confirmText: 'Authorize Order',
      type: 'warning'
    });
    if (!isConfirmed) return;

    try {
      await axios.post(`http://localhost:5000/api/supply/po/${id}/approve`, {}, config);
      toast.success('Purchase Order authorized.');
      loadCoreData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.');
    }
  };

  const handleCompletePO = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/supply/po/${id}/status`, { status: 'pending_approval' }, config);
      toast.success('Purchase Order completed.');
      loadCoreData();
      navigate('/supply/purchaseorder');
    } catch (err) {
      toast.error('Failed to complete Purchase Order.');
    }
  };

  const handleCompleteGRN = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/supply/grn/${id}/approve`, {}, config);
      toast.success('Goods Received Note completed & stock updated.');
      loadCoreData();
      navigate('/supply/grn');
    } catch (err) {
      toast.error('Failed to complete Goods Received Note.');
    }
  };

  const handleCompleteReturn = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/supply/returns/${id}/complete`, {}, config);
      toast.success('Supplier Return completed & stock adjusted.');
      loadCoreData();
      navigate('/supply/return');
    } catch (err) {
      toast.error('Failed to complete Supplier Return.');
    }
  };

  const handlePrintPO = (po) => {
    printService.a4Document({
      title: 'Purchase Order', docNumber: po.poNumber, date: new Date(po.createdAt).toLocaleDateString(),
      partyLabel: 'VENDOR', partyDetails: { name: po.supplier },
      items: po.items.map(i => ({ name: i.name, qty: i.quantityOrdered, price: i.estimatedCost, total: i.quantityOrdered * i.estimatedCost })),
      summaryFields: [{ label: 'Estimated Total', value: po.totalAmount, isGrand: true }],
      badge: po.status.toUpperCase(),
      settings
    });
  };

  const handlePrintGRN = (grn) => {
    printService.a4Document({
      title: 'Goods Received Note', docNumber: grn.grnNumber, date: new Date(grn.createdAt).toLocaleDateString(),
      partyLabel: 'RECEIVED FROM', partyDetails: { name: grn.supplier },
      items: grn.items.map(i => ({ name: i.name, qty: i.quantityReceived, price: i.costPrice, total: i.quantityReceived * i.costPrice, batch: i.batchNumber, expiry: i.expiryDate })),
      summaryFields: [{ label: 'Total Received Value', value: grn.totalValue, isGrand: true }],
      badge: 'RECEIVED',
      settings
    });
  };

  const handlePrintReturn = (rtn) => {
    printService.a4Document({
      title: 'Supplier Return', docNumber: rtn.returnNumber, date: new Date(rtn.createdAt).toLocaleDateString(),
      partyLabel: 'RETURNED TO', partyDetails: { name: rtn.supplier },
      items: rtn.items.map(i => ({ name: i.name, qty: i.quantityReturned, price: i.unitCost, total: i.quantityReturned * i.unitCost, batch: i.batchNumber })),
      summaryFields: [{ label: 'Total Return Value', value: rtn.totalValue, isGrand: true }],
      badge: 'RETURNED',
      notes: `Reason: ${rtn.reason}`,
      settings
    });
  };

  // --- GRN Logic ---
  const handlePORefChange = (poId) => {
    setGrnPoRef(poId);
    const po = purchaseOrders.find(p => p._id === poId);
    if (po) {
      setGrnSupplier(po.supplier);
      setGrnItemsWorkspace(po.items.map(i => {
        const defaultBatch = `B-${Math.floor(100000 + Math.random() * 900000)}`;
        const defaultExpiry = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
        const defaultSelling = Math.round(i.estimatedCost * 1.3);
        return {
          itemId: i.itemId, name: i.name, sku: i.sku, quantityOrdered: i.quantityOrdered, quantityReceived: i.quantityOrdered, 
          costPrice: i.estimatedCost, batchNumber: defaultBatch, expiryDate: defaultExpiry, sellingPrice: defaultSelling
        };
      }));
    }
  };

  const handleCreateGRN = async (statusType = 'approved') => {
    if (grnItemsWorkspace.length === 0) return toast.error('No items to receive.');
    try {
      await axios.post('http://localhost:5000/api/supply/grn', {
        poRef: grnPoRef, supplier: grnSupplier, items: grnItemsWorkspace, notes: grnNotes, status: statusType
      }, config);
      setIsGRNModalOpen(false);
      setGrnItemsWorkspace([]);
      setGrnPoRef('');
      loadCoreData();
      toast.success(statusType === 'draft' ? 'GRN saved as Draft.' : 'GRN processed and stock updated.');
    } catch (err) { toast.error('Failed to process GRN.'); }
  };

  // --- Return Logic ---
  const handleGRNRefChange = (grnId) => {
    setReturnGrnRef(grnId);
    const grn = grns.find(g => g._id === grnId);
    if (grn) {
      setReturnSupplier(grn.supplier);
      setReturnItemsWorkspace(grn.items.map(i => ({
        itemId: i.itemId, name: i.name, sku: i.sku, quantityReceived: i.quantityReceived, quantityReturned: 1, costPrice: i.costPrice
      })));
    }
  };

  const handleCreateReturn = async (statusType = 'completed') => {
    if (returnItemsWorkspace.length === 0) return toast.error('No items to return.');
    if (!returnSupplier.trim()) return toast.error('Supplier name is required.');
    try {
      await axios.post('http://localhost:5000/api/supply/returns', {
        grnRef: returnGrnRef, supplier: returnSupplier, items: returnItemsWorkspace, reason: returnReason, notes: returnNotes, status: statusType
      }, config);
      setIsReturnModalOpen(false);
      setReturnItemsWorkspace([]);
      setReturnGrnRef('');
      setReturnSupplier('');
      loadCoreData();
      toast.success(statusType === 'draft' ? 'Return saved as Draft.' : 'Return processed and stock adjusted.');
    } catch (err) { toast.error('Failed to process return.'); }
  };

  const activeTab = subpage === 'grn' ? 'grn' : subpage === 'return' ? 'return' : 'po';

  const filteredPurchaseOrders = purchaseOrders.filter(po => po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || po.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredGrns = grns.filter(grn => grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) || grn.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredReturns = returns.filter(rtn => rtn.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) || rtn.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Section */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-white">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Supply Chain & Procurement</h1>
            <p className="text-sm text-slate-500">Manage stock lifecycle from PO to Returns.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter records..."
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {!readOnly && (
            <button 
              onClick={() => {
                if (activeTab === 'po') setIsPOModalOpen(true);
                else if (activeTab === 'grn') setIsGRNModalOpen(true);
                else setIsReturnModalOpen(true);
              }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> 
              <span className="hidden sm:inline">{activeTab === 'po' ? 'New Purchase Order' : activeTab === 'grn' ? 'Process Inbound' : 'Create Return'}</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-10 px-4">
        <TabItem label="Purchase Orders" active={activeTab === 'po'} onClick={() => navigate('/supply/purchaseorder')} count={purchaseOrders.length} />
        <TabItem label="Inbound Receipts (GRN)" active={activeTab === 'grn'} onClick={() => navigate('/supply/grn')} count={grns.length} />
        <TabItem label="Supplier Returns" active={activeTab === 'return'} onClick={() => navigate('/supply/return')} count={returns.length} />
      </div>

      {/* Data Table Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'po' && (
            <TableWrapper headers={['PO Number', 'Supplier', 'Estimated Total', 'Status', 'Date', 'Actions']}>
              {filteredPurchaseOrders.map((po) => (
                <tr key={po._id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => navigate(`/supply/purchaseorder/${po.poNumber}`)}>
                  <td className="px-6 py-4 font-bold text-slate-900">{po.poNumber}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{po.supplier}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(po.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handlePrintPO(po)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Printer className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </TableWrapper>
          )}
          
          {activeTab === 'grn' && (
            <TableWrapper headers={settings.useCostPrice !== false ? ['GRN Number', 'Supplier', 'PO Ref', 'Total Value', 'Status', 'Received Date', 'Actions'] : ['GRN Number', 'Supplier', 'PO Ref', 'Status', 'Received Date', 'Actions']}>
              {filteredGrns.map((grn) => (
                <tr key={grn._id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => navigate(`/supply/grn/${grn.grnNumber}`)}>
                  <td className="px-6 py-4 font-bold text-slate-900">{grn.grnNumber}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{grn.supplier}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{grn.poNumber || 'MANUAL'}</td>
                  {settings.useCostPrice !== false && (
                    <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(grn.totalValue)}</td>
                  )}
                  <td className="px-6 py-4">
                    <StatusBadge status={grn.status || 'draft'} />
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{new Date(grn.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handlePrintGRN(grn)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Printer className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </TableWrapper>
          )}

          {activeTab === 'return' && (
            <TableWrapper headers={settings.useCostPrice !== false ? ['Return ID', 'Supplier', 'GRN Ref', 'Value', 'Reason', 'Status', 'Actions'] : ['Return ID', 'Supplier', 'GRN Ref', 'Reason', 'Status', 'Actions']}>
              {filteredReturns.map((rtn) => (
                <tr key={rtn._id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => navigate(`/supply/return/${rtn.returnNumber}`)}>
                  <td className="px-6 py-4 font-bold text-slate-900">{rtn.returnNumber}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{rtn.supplier}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{rtn.grnNumber}</td>
                  {settings.useCostPrice !== false && (
                    <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(rtn.totalValue)}</td>
                  )}
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase">{rtn.reason}</span></td>
                  <td className="px-6 py-4">
                    <StatusBadge status={rtn.status || 'draft'} />
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handlePrintReturn(rtn)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Printer className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </TableWrapper>
          )}
        </div>
      </div>

      {/* PO Creation Modal */}
      {isPOModalOpen && (
        <ModalWrapper title="Purchase Requisition" onClose={() => setIsPOModalOpen(false)}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Vendor / Supplier</label>
              <select 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500" 
                value={poSupplier} 
                onChange={e => setPoSupplier(e.target.value)}
              >
                <option value="">Select registered supplier...</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Estimated Delivery</label>
              <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Add Products</label>
            <SearchableSelect 
              placeholder="Search catalog for items..."
              options={catalogItems.map(i => ({ label: `${i.name} (${i.sku})`, value: i._id }))}
              onSelect={addProductToPO}
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                <tr><th className="p-4">Item</th><th className="p-4 text-center">Quantity</th><th className="p-4 text-right">Est. Cost</th><th className="p-4 text-right">Total</th><th className="p-4"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {poItemsWorkspace.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                    </td>
                    <td className="p-4">
                      <input type="number" min="1" className="w-20 mx-auto p-1.5 border border-slate-200 rounded text-center text-sm font-bold" value={item.quantityOrdered} onChange={e => { const updated = [...poItemsWorkspace]; updated[idx].quantityOrdered = parseInt(e.target.value) || 1; setPoItemsWorkspace(updated); }} />
                    </td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.estimatedCost)}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(item.quantityOrdered * item.estimatedCost)}</td>
                    <td className="p-4 text-right"><button onClick={() => setPoItemsWorkspace(poItemsWorkspace.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                  </tr>
                ))}
                {poItemsWorkspace.length === 0 && (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-300 text-xs font-bold uppercase">No items in order</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl text-white">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Estimated Value</p>
              <h2 className="text-3xl font-bold">{formatCurrency(poItemsWorkspace.reduce((sum, i) => sum + (i.quantityOrdered * i.estimatedCost), 0))}</h2>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleCreatePO('draft')} className="px-6 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors">Save as Draft</button>
              <button onClick={() => handleCreatePO('pending_approval')} className="px-6 py-2.5 bg-blue-600 rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">Finalize Order</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* GRN Modal */}
      {isGRNModalOpen && (
        <ModalWrapper title="Inventory Inbound (GRN)" onClose={() => setIsGRNModalOpen(false)}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Reference Purchase Order</label>
              <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={grnPoRef} onChange={e => handlePORefChange(e.target.value)}>
                <option value="">Select PO to fulfill...</option>
                {purchaseOrders.filter(p => p.status === 'approved').map(p => <option key={p._id} value={p._id}>{p.poNumber} ({p.supplier})</option>)}
              </select>
            </div>
          </div>

          {grnPoRef && (
            <>
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">Item</th>
                      {(settings.useBatchNumbers !== false || settings.useExpirationDates !== false) && (
                        <th className="p-4">Batch Details</th>
                      )}
                      <th className="p-4 text-center">Ordered</th>
                      <th className="p-4 text-center">Received</th>
                      <th className="p-4 text-right">Pricing</th>
                      {settings.useCostPrice !== false && <th className="p-4 text-right">Total</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grnItemsWorkspace.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-4 font-bold text-slate-800">{item.name}</td>
                        {(settings.useBatchNumbers !== false || settings.useExpirationDates !== false) && (
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {settings.useBatchNumbers !== false && (
                                <input type="text" placeholder="Batch #" className="w-24 p-1.5 border border-slate-200 rounded text-xs font-mono" value={item.batchNumber} onChange={e => { const updated = [...grnItemsWorkspace]; updated[idx].batchNumber = e.target.value; setGrnItemsWorkspace(updated); }} />
                              )}
                              {settings.useExpirationDates !== false && (
                                <input type="date" className="w-32 p-1.5 border border-slate-200 rounded text-xs" value={item.expiryDate} onChange={e => { const updated = [...grnItemsWorkspace]; updated[idx].expiryDate = e.target.value; setGrnItemsWorkspace(updated); }} />
                              )}
                            </div>
                          </td>
                        )}
                        <td className="p-4 text-center font-mono text-slate-400">{item.quantityOrdered}</td>
                        <td className="p-4 text-center">
                          <input type="number" className="w-20 p-1.5 border border-slate-200 rounded text-center text-sm font-bold bg-white" value={item.quantityReceived} onChange={e => { const updated = [...grnItemsWorkspace]; updated[idx].quantityReceived = parseInt(e.target.value) || 0; setGrnItemsWorkspace(updated); }} />
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col gap-1 items-end">
                            {settings.useCostPrice !== false && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">Cost:</span>
                                <input type="number" className="w-20 p-1.5 border border-slate-200 rounded text-right text-xs font-bold" value={item.costPrice} onChange={e => { const updated = [...grnItemsWorkspace]; updated[idx].costPrice = parseFloat(e.target.value) || 0; setGrnItemsWorkspace(updated); }} />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">Sell:</span>
                              <input type="number" className="w-20 p-1.5 border border-slate-200 rounded text-right text-xs font-bold" value={item.sellingPrice} onChange={e => { const updated = [...grnItemsWorkspace]; updated[idx].sellingPrice = parseFloat(e.target.value) || 0; setGrnItemsWorkspace(updated); }} />
                            </div>
                          </div>
                        </td>
                        {settings.useCostPrice !== false && (
                          <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(item.quantityReceived * item.costPrice)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end p-4 bg-slate-50 border-t gap-3 rounded-b-xl">
                 <button onClick={() => setIsGRNModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600">Cancel</button>
                 <button onClick={() => handleCreateGRN('draft')} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm shadow hover:bg-slate-700 transition-colors">Save as Draft</button>
                 <button onClick={() => handleCreateGRN('approved')} className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-200">Save & Approve</button>
              </div>
            </>
          )}
        </ModalWrapper>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
        <ModalWrapper title="Supplier Return Authorization" onClose={() => setIsReturnModalOpen(false)}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Supplier</label>
              <select 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500" 
                value={returnSupplier} 
                onChange={e => setReturnSupplier(e.target.value)}
              >
                <option value="">Select registered supplier...</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Return Reason</label>
              <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                <option value="Damaged">Damaged</option>
                <option value="Incorrect Item">Incorrect Item</option>
                <option value="Expired">Expired</option>
                <option value="Overstock">Overstock</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Add Batches to Return</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect 
                  placeholder={settings.useBatchNumbers !== false ? "Search inventory for item batches..." : "Search inventory for items..."}
                  options={catalogItems.flatMap(i => (i.batches || []).filter(b => b.status === 'active' && b.quantity > 0).map(b => ({
                    label: settings.useBatchNumbers !== false
                      ? `${i.name} (${i.sku}) - Batch: ${b.batchNumber} (Avail: ${b.quantity})`
                      : `${i.name} (${i.sku}) (Avail: ${b.quantity})`,
                    value: `${i._id}|${b.batchNumber}`
                  })))}
                  onSelect={(val) => {
                    const [itemId, batchNumber] = val.split('|');
                    const item = catalogItems.find(i => i._id === itemId);
                    const batch = item.batches.find(b => b.batchNumber === batchNumber);
                    if (returnItemsWorkspace.some(r => r.itemId === itemId && r.batchNumber === batchNumber)) return toast.info('Batch already added.');
                    setReturnItemsWorkspace([...returnItemsWorkspace, {
                      itemId: item._id, name: item.name, sku: item.sku, batchNumber: batch.batchNumber,
                      quantityAvailable: batch.quantity, quantityReturned: 1, unitCost: batch.costPrice
                    }]);
                  }}
                />
              </div>
              <button 
                onClick={() => setReturnItemsWorkspace(returnItemsWorkspace.map(i => ({ ...i, quantityReturned: i.quantityAvailable })))}
                className="px-4 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                Return All (Max Qty)
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Item</th>
                  {settings.useBatchNumbers !== false && <th className="p-4 text-center">Batch</th>}
                  <th className="p-4 text-center">Available</th>
                  <th className="p-4 text-center">To Return</th>
                  {settings.useCostPrice !== false && <th className="p-4 text-right">Value</th>}
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnItemsWorkspace.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-4 font-bold text-slate-800">{item.name}</td>
                    {settings.useBatchNumbers !== false && <td className="p-4 text-center font-mono text-xs">{item.batchNumber}</td>}
                    <td className="p-4 text-center font-mono text-slate-400">{item.quantityAvailable}</td>
                    <td className="p-4 text-center">
                      <input type="number" min="1" max={item.quantityAvailable} className="w-20 p-1.5 border border-slate-200 rounded text-center text-sm font-bold bg-white" value={item.quantityReturned} onChange={e => { const updated = [...returnItemsWorkspace]; updated[idx].quantityReturned = parseInt(e.target.value) || 1; setReturnItemsWorkspace(updated); }} />
                    </td>
                    {settings.useCostPrice !== false && <td className="p-4 text-right font-bold">{formatCurrency(item.quantityReturned * item.unitCost)}</td>}
                    <td className="p-4 text-right"><button onClick={() => setReturnItemsWorkspace(returnItemsWorkspace.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500"/></button></td>
                  </tr>
                ))}
                {returnItemsWorkspace.length === 0 && (
                  <tr><td colSpan={settings.useCostPrice !== false ? (settings.useBatchNumbers !== false ? 6 : 5) : (settings.useBatchNumbers !== false ? 5 : 4)} className="p-10 text-center text-slate-300 text-xs font-bold uppercase">No items added for return</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end p-4 bg-slate-50 border-t gap-3 rounded-b-xl">
              <button onClick={() => setIsReturnModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button onClick={() => handleCreateReturn('draft')} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm shadow hover:bg-slate-700 transition-colors">Save as Draft</button>
              <button onClick={() => handleCreateReturn('completed')} className="px-8 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-red-200">Confirm & Deduct Stock</button>
          </div>
        </ModalWrapper>
      )}

      {/* Viewer Modals */}
      {viewingPO && (
        <ModalWrapper title={`Purchase Order Details - ${viewingPO.poNumber}`} onClose={() => navigate('/supply/purchaseorder')}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div><p className="text-xs text-slate-500 font-bold uppercase">Supplier</p><p className="font-medium text-slate-900">{viewingPO.supplier}</p></div>
              <div><p className="text-xs text-slate-500 font-bold uppercase">Date</p><p className="font-medium text-slate-900">{new Date(viewingPO.createdAt).toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-500 font-bold uppercase">Status</p><div className="mt-1"><StatusBadge status={viewingPO.status} /></div></div>
              <div><p className="text-xs text-slate-500 font-bold uppercase">Total Amount</p><p className="font-bold text-slate-900">{formatCurrency(viewingPO.totalAmount)}</p></div>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                  <tr><th className="p-4">Item</th><th className="p-4 text-center">Qty</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingPO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-4 font-bold text-slate-800">{item.name}</td>
                      <td className="p-4 text-center">{item.quantityOrdered}</td>
                      <td className="p-4 text-right">{formatCurrency(item.estimatedCost)}</td>
                      <td className="p-4 text-right font-bold">{formatCurrency(item.quantityOrdered * item.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {viewingPO.notes && (
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Notes</p>
                <p className="text-sm text-slate-700">{viewingPO.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => navigate('/supply/purchaseorder')} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Close</button>
              {viewingPO.status === 'draft' && (
                <button onClick={() => handleCompletePO(viewingPO._id)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Complete PO
                </button>
              )}
              {viewingPO.status === 'pending_approval' && (user?.role === 'admin' || user?.access?.approvals) && (
                <button onClick={() => { handleApprovePO(viewingPO._id); navigate('/supply/purchaseorder'); }} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-green-700 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Approve Order
                </button>
              )}
            </div>
          </div>
        </ModalWrapper>
      )}

      {viewingGRN && (
        <ModalWrapper title={`GRN Details - ${viewingGRN.grnNumber}`} onClose={() => navigate('/supply/grn')}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div><p className="text-xs text-slate-500 font-bold uppercase">Supplier</p><p className="font-medium text-slate-900">{viewingGRN.supplier}</p></div>
              <div><p className="text-xs text-slate-500 font-bold uppercase">Date</p><p className="font-medium text-slate-900">{new Date(viewingGRN.createdAt).toLocaleString()}</p></div>
              {viewingGRN.poRef && <div><p className="text-xs text-slate-500 font-bold uppercase">PO Ref</p><p className="font-medium text-slate-900">{purchaseOrders.find(p => p._id === viewingGRN.poRef)?.poNumber || viewingGRN.poRef}</p></div>}
              <div><p className="text-xs text-slate-500 font-bold uppercase">Status</p><div className="mt-1"><StatusBadge status={viewingGRN.status || 'draft'} /></div></div>
              {settings.useCostPrice !== false && (
                <div><p className="text-xs text-slate-500 font-bold uppercase">Total Value</p><p className="font-bold text-slate-900">{formatCurrency(viewingGRN.totalValue)}</p></div>
              )}
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="p-4">Item</th>
                    {settings.useBatchNumbers !== false && <th className="p-4 text-center">Batch</th>}
                    <th className="p-4 text-center">Qty</th>
                    {settings.useCostPrice !== false && (
                      <>
                        <th className="p-4 text-right">Unit Cost</th>
                        <th className="p-4 text-right">Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingGRN.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-4 font-bold text-slate-800">{item.name}</td>
                      {settings.useBatchNumbers !== false && <td className="p-4 text-center font-mono text-xs">{item.batchNumber}</td>}
                      <td className="p-4 text-center">{item.quantityReceived}</td>
                      {settings.useCostPrice !== false && (
                        <>
                          <td className="p-4 text-right">{formatCurrency(item.costPrice)}</td>
                          <td className="p-4 text-right font-bold">{formatCurrency(item.quantityReceived * item.costPrice)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => navigate('/supply/grn')} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Close</button>
              {viewingGRN.status === 'draft' && (
                <button onClick={() => handleCompleteGRN(viewingGRN._id)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Complete GRN
                </button>
              )}
            </div>
          </div>
        </ModalWrapper>
      )}

      {viewingReturn && (
        <ModalWrapper title={`Supplier Return Details - ${viewingReturn.returnNumber}`} onClose={() => navigate('/supply/return')}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div><p className="text-xs text-slate-500 font-bold uppercase">Supplier</p><p className="font-medium text-slate-900">{viewingReturn.supplier}</p></div>
              <div><p className="text-xs text-slate-500 font-bold uppercase">Date</p><p className="font-medium text-slate-900">{new Date(viewingReturn.createdAt).toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-500 font-bold uppercase">Reason</p><p className="font-medium text-slate-900">{viewingReturn.reason}</p></div>
              <div><p className="text-xs text-slate-500 font-bold uppercase">Status</p><div className="mt-1"><StatusBadge status={viewingReturn.status || 'draft'} /></div></div>
              {settings.useCostPrice !== false && (
                <div><p className="text-xs text-slate-500 font-bold uppercase">Total Value</p><p className="font-bold text-slate-900">{formatCurrency(viewingReturn.totalValue)}</p></div>
              )}
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="p-4">Item</th>
                    {settings.useBatchNumbers !== false && <th className="p-4 text-center">Batch</th>}
                    <th className="p-4 text-center">Qty Returned</th>
                    {settings.useCostPrice !== false && (
                      <>
                        <th className="p-4 text-right">Unit Cost</th>
                        <th className="p-4 text-right">Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingReturn.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-4 font-bold text-slate-800">{item.name}</td>
                      {settings.useBatchNumbers !== false && <td className="p-4 text-center font-mono text-xs">{item.batchNumber}</td>}
                      <td className="p-4 text-center">{item.quantityReturned}</td>
                      {settings.useCostPrice !== false && (
                        <>
                          <td className="p-4 text-right">{formatCurrency(item.unitCost)}</td>
                          <td className="p-4 text-right font-bold">{formatCurrency(item.quantityReturned * item.unitCost)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => navigate('/supply/return')} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Close</button>
              {viewingReturn.status === 'draft' && (
                <button onClick={() => handleCompleteReturn(viewingReturn._id)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-red-700 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Complete Return
                </button>
              )}
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};

const TabItem = ({ label, active, onClick, count }) => (
  <button 
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

const TableWrapper = ({ headers, children }) => (
  <table className="w-full text-left">
    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
      <tr>
        {headers.map(h => <th key={h} className="px-6 py-4">{h}</th>)}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 text-sm">
      {children}
    </tbody>
  </table>
);

const StatusBadge = ({ status }) => {
  const styles = {
    approved: "bg-green-50 border-green-100 text-green-700",
    completed: "bg-green-50 border-green-100 text-green-700",
    pending_approval: "bg-blue-50 border-blue-100 text-blue-700",
    draft: "bg-slate-50 border-slate-200 text-slate-500",
    fulfilled: "bg-indigo-50 border-indigo-100 text-indigo-700"
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles[status] || styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const ModalWrapper = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileEdit className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold tracking-tight">{title}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X className="w-6 h-6"/></button>
      </div>
      <div className="p-8">
        {children}
      </div>
    </div>
  </div>
);

const SearchableSelect = ({ options, onSelect, placeholder = "Search..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const filtered = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative">
      <div 
        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-slate-500">{placeholder}</span>
        <Search className="w-4 h-4 text-slate-400" />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
            <input
              type="text"
              autoFocus
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500"
              placeholder="Type to search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          {filtered.length > 0 ? filtered.map((opt, i) => (
            <div 
              key={i} 
              className="p-2.5 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
              onClick={() => { onSelect(opt.value); setIsOpen(false); setSearchTerm(''); }}
            >
              {opt.label}
            </div>
          )) : (
            <div className="p-3 text-sm text-slate-400 text-center">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupplyChain;
