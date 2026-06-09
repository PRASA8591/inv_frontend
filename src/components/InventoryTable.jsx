import React from 'react';
import { Edit2, Trash2, PackageX, DollarSign, Hash, Barcode, Layers, AlertTriangle, Eye } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const InventoryTable = ({ items, onEdit, onDelete, loading, readOnly }) => {
  const { formatCurrency } = useSettings();
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Loading data...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <PackageX className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No records found</h3>
        <p className="text-sm text-slate-500 mt-1">No products matched your current filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="px-8 py-5">Item Description</th>
            <th className="px-6 py-5">Category</th>
            <th className="px-6 py-5 text-right">SKU / Serial</th>
            <th className="px-6 py-5 text-right">Unit Value</th>
            <th className="px-8 py-5 text-center">Operations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {items.map((item) => (
            <tr key={item._id} className="hover:bg-blue-50/30 transition-colors group">
              <td className="px-8 py-5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${
                      item.status === 'inactive'
                        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {item.status || 'active'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                    <Barcode className="w-3 h-3" /> {item.barcode || 'NO-BARCODE'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-600">
                  <Layers className="w-3 h-3 text-blue-500" />
                  {item.category}
                </span>
              </td>
              <td className="px-6 py-5 text-right font-mono text-xs font-bold text-slate-400 tracking-tighter">
                {item.sku}
              </td>
              <td className="px-6 py-5 text-right font-bold text-slate-900">
                {formatCurrency(item.price)}
              </td>
              <td className="px-8 py-5">
                <div className="flex items-center justify-center gap-3">
                  <button 
                    onClick={() => onEdit(item)}
                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                    title={readOnly ? "View Details" : "Edit Record"}
                  >
                    {readOnly ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  </button>
                  {!readOnly && (
                    <button 
                      onClick={() => onDelete(item._id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
