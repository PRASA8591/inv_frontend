import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Package, 
  AlertCircle, 
  DollarSign, 
  Box,
  Filter,
  LayoutGrid,
  ChevronRight,
  Edit2,
  Trash2,
  Barcode,
  Layers
} from 'lucide-react';
import InventoryTable from '../components/InventoryTable';
import InventoryForm from '../components/InventoryForm';

const ItemsManagement = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin' && !user?.access?.items_edit;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const navigate = useNavigate();
  const { itemName } = useParams();

  const API_URL = 'http://localhost:5000/api/inventory';
  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL, config);
      setItems(res.data);
    } catch (err) {
      toast.error('Failed to sync catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (items.length > 0 && itemName) {
      if (itemName === 'new') {
        setEditingItem(null);
        setIsModalOpen(true);
      } else {
        const decodedName = decodeURIComponent(itemName).replace(/^item-/, '');
        const found = items.find(i => i.name === decodedName);
        if (found) {
          setEditingItem(found);
          setIsModalOpen(true);
        } else {
          navigate('/items');
        }
      }
    } else if (!itemName && isModalOpen) {
      setIsModalOpen(false);
      setEditingItem(null);
    }
  }, [items, itemName]);

  const handleAddItem = () => {
    setEditingItem(null);
    setIsModalOpen(true);
    navigate('/items/edit/new');
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
    navigate('/items/edit/item-' + encodeURIComponent(item.name));
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingItem) {
        await axios.put(`${API_URL}/${editingItem._id}`, formData, config);
      } else {
        await axios.post(API_URL, formData, config);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      navigate('/items');
      toast.success(editingItem ? 'Item updated successfully.' : 'Item added successfully.');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed.');
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Item?',
      message: 'This operation will permanently remove the item from the database. Stock data will be lost.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await axios.delete(`${API_URL}/${id}`, config);
        toast.success('Item deleted.');
        fetchItems();
      } catch (err) {
        toast.error('Deletion failed.');
      }
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    totalItems: items.length,
    totalValue: items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
    lowStock: items.filter(item => item.quantity <= 5).length,
    categories: new Set(items.map(i => i.category)).size
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Advanced Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Box className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Catalog</h1>
            <p className="text-sm text-slate-500 font-medium">Manage product specifications and stock metrics.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchItems} 
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!readOnly && (
            <button 
              onClick={handleAddItem}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md shadow-blue-100 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" /> Add New Item
            </button>
          )}
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Items" value={stats.totalItems} icon={<Package className="w-5 h-5" />} color="blue" sub="Managed items" />
        <MetricCard label="Gross Valuation" value={formatCurrency(stats.totalValue)} icon={<DollarSign className="w-5 h-5" />} color="green" sub="Asset total" />
        <MetricCard label="Stock Alerts" value={stats.lowStock} icon={<AlertCircle className="w-5 h-5" />} color="red" sub="Threshold reached" />
        <MetricCard label="Categories" value={stats.categories} icon={<Layers className="w-5 h-5" />} color="indigo" sub="Item groups" />
      </div>

      {/* Items Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-[400px] group">
            <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Query by Name, SKU, or Category..."
              className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
             <Filter className="w-4 h-4 text-slate-400" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Showing: <span className="text-blue-600 ml-1">{filteredItems.length} Records</span></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <InventoryTable 
            items={filteredItems} 
            loading={loading}
            onEdit={handleEditItem} 
            onDelete={handleDelete}
            readOnly={readOnly}
          />
        </div>
      </div>

      <InventoryForm 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          navigate('/items');
        }} 
        onSubmit={handleSubmit}
        itemToEdit={editingItem}
        readOnly={readOnly}
        items={items}
      />
    </div>
  );
};

const MetricCard = ({ label, value, icon, color, sub }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5",
    red: "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-500/5",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/5"
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 group hover:border-blue-200 transition-all select-none">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
        <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5 truncate" title={value}>{value}</p>
        {sub && <p className="text-[9px] font-medium text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
};

export default ItemsManagement;
