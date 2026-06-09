import React, { useState, useEffect } from 'react';
import { X, Save, PackagePlus, Info, Zap, ShieldCheck } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const getNextSku = (itemsList) => {
  let maxNum = 0;
  itemsList.forEach(item => {
    if (item.sku) {
      const num = parseInt(item.sku, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  const nextNum = maxNum + 1;
  return String(nextNum).padStart(5, '0');
};

const InventoryForm = ({ isOpen, onClose, onSubmit, itemToEdit, readOnly, items = [] }) => {
  const { settings } = useSettings();

  const initialState = {
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category: 'Other',
    subCategory: '',
    unitType: 'pieces',
    taxBracket: 0,
    price: 0,
    costPrice: 0,
    sellingPrice: 0,
    quantity: 0,
    reorderPoint: 5,
    supplier: '',
    status: 'active'
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        ...initialState,
        ...itemToEdit
      });
    } else {
      const nextSku = getNextSku(items);
      setFormData({
        ...initialState,
        sku: nextSku
      });
    }
  }, [itemToEdit, isOpen, items]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['quantity', 'price', 'costPrice', 'sellingPrice', 'taxBracket', 'reorderPoint'];
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: numericFields.includes(name) ? Number(value) : value
      };
      if (name === 'sellingPrice') {
        updated.price = Number(value);
      } else if (name === 'price') {
        updated.sellingPrice = Number(value);
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
               {itemToEdit ? <Zap className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-800">
                {readOnly ? 'Product Details' : (itemToEdit ? 'Edit Product' : 'Add New Product')}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Record ID: {itemToEdit ? itemToEdit._id : 'PENDING'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[75vh] custom-scrollbar">
          <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            
            <div className="sm:col-span-2">
              <label className="label-style">Article Designation <span className="text-red-500">*</span></label>
              <input 
                type="text" name="name" required value={formData.name} onChange={handleChange} disabled={readOnly}
                className="input-field" placeholder="e.g. Precision Surgical Kit v2"
              />
            </div>

            <div>
              <label className="label-style">Item SKU <span className="text-red-500">*</span></label>
              <input 
                type="text" name="sku" required value={formData.sku} onChange={handleChange} 
                disabled={readOnly || !itemToEdit}
                className="input-field font-mono bg-slate-50/50" placeholder="00001"
              />
            </div>

            <div>
              <label className="label-style">UPC / EAN Barcode</label>
              <input 
                type="text" name="barcode" value={formData.barcode} onChange={handleChange} disabled={readOnly}
                className="input-field font-mono bg-slate-50/50" placeholder="000000000000"
              />
            </div>

            <div>
              <label className="label-style">Category <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="category" 
                required 
                list="category-options"
                value={formData.category} 
                onChange={handleChange} disabled={readOnly}
                className="input-field" 
                placeholder="Type or select category..."
              />
              <datalist id="category-options">
                <option value="Electronics" />
                <option value="Furniture" />
                <option value="Stationery" />
                <option value="Food & Beverage" />
                <option value="Medical / Pharma" />
                <option value="Hardware & Tools" />
                <option value="Clothing & Apparel" />
                <option value="Automotive" />
                <option value="Cosmetics" />
                <option value="Books & Media" />
                <option value="Toys & Games" />
                <option value="Services" />
                <option value="Other Assets" />
              </datalist>
            </div>

            <div>
              <label className="label-style">Unit Measurement</label>
              <select name="unitType" value={formData.unitType} onChange={handleChange} disabled={readOnly} className="input-field cursor-pointer">
                <option value="pieces">Single Unit (Pcs)</option>
                <option value="boxes">Bulk Box / Ctn</option>
                <option value="kilograms">Mass (Kg)</option>
                <option value="liters">Volume (L)</option>
                <option value="packs">Standard Pack</option>
              </select>
            </div>

             <div className="pt-4 border-t border-slate-100 sm:col-span-2"></div>

             {settings.useCostPrice !== false && (
              <div>
                <label className="label-style text-rose-500 font-bold">Cost Price <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 inset-y-0 flex items-center font-bold text-slate-400">
                    {settings.currencySymbol || 'Rs.'}
                  </span>
                  <input 
                    type="number" name="costPrice" min="0" step="0.01" required value={formData.costPrice} onChange={handleChange} disabled={readOnly}
                    className="input-field pl-11 font-bold text-slate-800" placeholder="0.00"
                  />
                </div>
              </div>
             )}

            <div>
              <label className="label-style text-blue-600 font-bold">Selling Price <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 inset-y-0 flex items-center font-bold text-slate-400">
                  {settings.currencySymbol || 'Rs.'}
                </span>
                <input 
                  type="number" name="sellingPrice" min="0" step="0.01" required value={formData.sellingPrice} onChange={handleChange} disabled={readOnly}
                  className="input-field pl-11 font-bold text-slate-800" placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="label-style text-slate-700 font-bold">Opening Stock Level <span className="text-red-500">*</span></label>
              <input 
                type="number" name="quantity" min="0" required value={formData.quantity} onChange={handleChange} disabled={readOnly || itemToEdit}
                className="input-field" placeholder="0"
              />
            </div>

            <div>
              <label className="label-style">Reorder Point</label>
              <input 
                type="number" name="reorderPoint" min="0" value={formData.reorderPoint} onChange={handleChange} disabled={readOnly}
                className="input-field" placeholder="5"
              />
            </div>

            <div>
              <label className="label-style text-amber-600">Tax Rate (%)</label>
              <input 
                type="number" name="taxBracket" min="0" max="100" value={formData.taxBracket} onChange={handleChange} disabled={readOnly}
                className="input-field" placeholder="0"
              />
            </div>

            <div>
              <label className="label-style text-emerald-600 font-bold">Status</label>
              <select name="status" value={formData.status || 'active'} onChange={handleChange} disabled={readOnly} className="input-field cursor-pointer font-bold text-slate-800">
                <option value="active">Active (Available)</option>
                <option value="inactive">Inactive (Deactivated)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label-style">Notes</label>
              <textarea 
                name="description" rows="3" value={formData.description} onChange={handleChange} disabled={readOnly}
                className="input-field resize-none" placeholder="Enter technical specifications or storage instructions..."
              ></textarea>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3 text-slate-400">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">Data Integrity Check<br/>Ready to Save</span>
             </div>
             <div className="flex gap-3">
                <button type="button" onClick={onClose} className={readOnly ? "btn-primary px-6" : "btn-secondary"}>{readOnly ? "Close" : "Cancel"}</button>
                {!readOnly && (
                  <button type="submit" className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" /> 
                    {itemToEdit ? 'Save Changes' : 'Save Item'}
                  </button>
                )}
             </div>
          </div>
        </form>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .label-style {
          display: block;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94a3b8;
          margin-bottom: 0.5rem;
          padding-left: 0.25rem;
        }
      `}} />
    </div>
  );
};

export default InventoryForm;
