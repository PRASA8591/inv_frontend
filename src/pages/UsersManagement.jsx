import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserPlus,
  Lock,
  Edit2,
  CheckCircle2,
  Settings,
  ShieldCheck,
  ShieldAlert,
  X,
  Key,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';

const UsersManagement = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { user: currentUser } = useAuth();
  const readOnly = currentUser?.role !== 'admin' && !currentUser?.access?.users_edit;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const isEditReadOnly = !selectedUser || readOnly || (selectedUser.role === 'admin' && currentUser?.role !== 'admin');

  const defaultAccess = {
    dashboard: true,
    items: true,
    items_edit: true,
    stock: true,
    stock_edit: true,
    pos: true,
    price: true,
    crm: false,
    crm_edit: false,
    supply: false,
    supply_edit: false,
    invoices: false,
    invoices_edit: false,
    users: false,
    users_edit: false,
    reports: true,
    settings: false,
    approvals: false,
    recent_bills: false,
    direct_stock: true
  };

  const [warehouses, setWarehouses] = useState([]);
  const [newUserData, setNewUserData] = useState({
    username: '', password: '', role: 'user',
    access: { ...defaultAccess },
    allowedWarehouses: []
  });

  const [editUserData, setEditUserData] = useState({
    role: 'user', password: '', 
    access: { ...defaultAccess },
    allowedWarehouses: []
  });

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:5000/api/users', config);
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unauthorized access.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/warehouses', config);
      setWarehouses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users', newUserData, config);
      setShowAddModal(false);
      setNewUserData({
        username: '', password: '', role: 'user',
        access: { ...defaultAccess },
        allowedWarehouses: []
      });
      toast.success(`User ${newUserData.username} created.`);
      fetchUsers();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to create user.'); 
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditUserData({ 
      role: user.role, 
      password: '', 
      access: user.access ? { ...defaultAccess, ...user.access } : { ...defaultAccess },
      allowedWarehouses: user.allowedWarehouses ? user.allowedWarehouses.map(w => w._id || w) : []
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { role: editUserData.role, access: editUserData.access, allowedWarehouses: editUserData.allowedWarehouses };
      if (editUserData.password) payload.password = editUserData.password;
      await axios.put(`http://localhost:5000/api/users/${selectedUser._id}`, payload, config);
      setShowEditModal(false);
      toast.success('User updated.');
      fetchUsers();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to update user.'); 
    }
  };

  const handleDeleteUser = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete User?',
      message: 'This action will permanently delete the user account.',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${id}`, config);
        toast.success('User deleted.');
        fetchUsers();
      } catch (err) { 
        toast.error('Failed to delete user.'); 
      }
    }
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  // Definition of permissions for rendering
  const permissionsConfig = [
    { key: 'dashboard', label: 'Dashboard', isSplit: false },
    { key: 'pos', label: 'POS Terminal', isSplit: false },
    { key: 'price', label: 'Price Management', isSplit: false },
    { key: 'reports', label: 'Reports Page', isSplit: false },
    { key: 'settings', label: 'System Settings', isSplit: false },
    { key: 'approvals', label: 'PO Approvals', isSplit: false },
    { key: 'recent_bills', label: 'View Recent Bills', isSplit: false },
    { key: 'direct_stock', label: 'Direct Stock Add Page', isSplit: false },
    
    // Split Modules
    { key: 'items', label: 'Items Catalog', isSplit: true, editKey: 'items_edit', viewLabel: 'View Catalog', editLabel: 'Add/Edit/Delete' },
    { key: 'stock', label: 'Stock Levels', isSplit: true, editKey: 'stock_edit', viewLabel: 'View Stock', editLabel: 'Adjust Stock' },
    { key: 'crm', label: 'CRM (Customers)', isSplit: true, editKey: 'crm_edit', viewLabel: 'View Customers', editLabel: 'Manage Customers' },
    { key: 'supply', label: 'Supply Chain', isSplit: true, editKey: 'supply_edit', viewLabel: 'View PO/GRN/Returns', editLabel: 'Create PO/GRN/Returns' },
    { key: 'invoices', label: 'Invoices', isSplit: true, editKey: 'invoices_edit', viewLabel: 'View Invoices', editLabel: 'Create Invoices' },
    { key: 'users', label: 'System Users', isSplit: true, editKey: 'users_edit', viewLabel: 'View Users List', editLabel: 'Manage Users' },
  ];

  if (error) return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md mx-auto mt-12">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-black text-slate-800 tracking-tight">Access Denied</h3>
      <p className="text-slate-500 text-sm text-center mt-2 mb-6">{error}</p>
      <button onClick={() => window.location.href = '/'} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-transform active:scale-95">Back to Home</button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Users</h1>
            <p className="text-sm text-slate-500 font-medium">Manage user identities, admin keys, and tick-mark access clearances.</p>
          </div>
        </div>
        
        {!readOnly && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-150 transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <UserPlus className="w-4 h-4" /> Create User Account
          </button>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard icon={<Users className="w-5 h-5"/>} label="Total User Directory" value={users.length} color="blue" description="Active login records" />
        <StatusCard icon={<Shield className="w-5 h-5"/>} label="Administrator Scope" value={users.filter(u=>u.role==='admin').length} color="indigo" description="Superuser access" />
        <StatusCard icon={<UserCheck className="w-5 h-5"/>} label="Standard Operator" value={users.filter(u=>u.role==='user').length} color="green" description="Granular access users" />
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-4 inset-y-0 my-auto h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Query user database..." 
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-semibold text-slate-700" 
              value={searchTerm} 
              onChange={e=>setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Operator Identity</th>
                <th className="px-6 py-5">Role Permission</th>
                <th className="px-6 py-5">Active Clearances</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredUsers.map(u => {
                const permitsCount = Object.values(u.access || {}).filter(v => v === true).length;
                return (
                  <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      {u.username}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest ${
                        u.role === 'admin' 
                          ? 'bg-amber-50 text-amber-600 border-amber-200' 
                          : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-500 font-semibold text-xs">
                      {u.role === 'admin' ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5"/> All Module Master Access</span>
                      ) : (
                        <span>{permitsCount} permissions granted</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(u)} 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all" 
                          title={(u.role === 'admin' && currentUser?.role !== 'admin') || readOnly ? "View Clearances" : "Configure Account"}
                        >
                          <Settings className="w-4 h-4"/>
                        </button>
                        {!readOnly && (
                          u.role === 'admin' ? (
                            <button 
                              disabled
                              className="p-2 text-slate-300 cursor-not-allowed rounded-xl border border-transparent opacity-50"
                              title="Administrator accounts cannot be deleted"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleDeleteUser(u._id)} 
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-sm uppercase tracking-widest">Register Operator</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="hover:bg-slate-800 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Credentials Section */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Username</label>
                  <input 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newUserData.username} 
                    onChange={e=>setNewUserData({...newUserData, username: e.target.value})} 
                    placeholder="Enter name..."
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Password</label>
                  <input 
                    type="password" 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newUserData.password} 
                    onChange={e=>setNewUserData({...newUserData, password: e.target.value})} 
                    placeholder="Enter password..."
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Role Type</label>
                  <select 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer" 
                    value={newUserData.role} 
                    onChange={e=>setNewUserData({...newUserData, role: e.target.value})}
                  >
                    <option value="user">Standard User</option>
                    {currentUser?.role === 'admin' && <option value="admin">Administrator</option>}
                  </select>
                </div>
              </div>

              {/* Permissions Checklist Section */}
              {newUserData.role === 'user' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Tick-Mark Permission Clearances</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Mark access targets</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {permissionsConfig.map(p => {
                      if (p.isSplit) {
                        return (
                          <div key={p.key} className="p-4 border border-slate-200 rounded-xl bg-slate-50/40 space-y-3">
                            <span className="text-[11px] font-black text-slate-800 block border-b border-slate-100 pb-1.5">{p.label}</span>
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={!!newUserData.access[p.key]} 
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setNewUserData({
                                      ...newUserData, 
                                      access: { 
                                        ...newUserData.access, 
                                        [p.key]: val, 
                                        ...(val ? {} : { [p.editKey]: false }) 
                                      }
                                    });
                                  }}
                                  className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-600">{p.viewLabel}</span>
                              </label>
                              
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={!!newUserData.access[p.editKey]} 
                                  disabled={!newUserData.access[p.key]}
                                  onChange={(e) => {
                                    setNewUserData({
                                      ...newUserData, 
                                      access: { ...newUserData.access, [p.editKey]: e.target.checked }
                                    });
                                  }}
                                  className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                                />
                                <span className="text-xs font-bold text-slate-650 disabled-label-style">{p.editLabel}</span>
                              </label>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <label key={p.key} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50/70 cursor-pointer select-none transition-colors h-[64px]">
                            <input 
                              type="checkbox" 
                              checked={!!newUserData.access[p.key]} 
                              onChange={(e) => {
                                setNewUserData({
                                  ...newUserData, 
                                  access: { ...newUserData.access, [p.key]: e.target.checked }
                                });
                              }}
                              className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">{p.label}</span>
                          </label>
                        );
                      }
                    })}
                  </div>
                </div>
              )}

              {/* Location Access Section */}
              {newUserData.role === 'user' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Authorized Locations</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Warehouse Access</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {warehouses.map(w => {
                      const isChecked = newUserData.allowedWarehouses.includes(w._id);
                      return (
                        <label key={w._id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50/70 cursor-pointer select-none transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewUserData(prev => ({
                                ...prev,
                                allowedWarehouses: checked 
                                  ? [...prev.allowedWarehouses, w._id] 
                                  : prev.allowedWarehouses.filter(id => id !== w._id)
                              }));
                            }}
                            className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-700">{w.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">{w.code}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
                <button type="button" onClick={()=>setShowAddModal(false)} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-750 uppercase tracking-wider">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-sm uppercase tracking-widest">Configure Account: {selectedUser?.username}</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="hover:bg-slate-800 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Credentials / Details */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">New Password (optional)</label>
                  <input 
                    type="password" 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={editUserData.password} 
                    disabled={isEditReadOnly} 
                    onChange={e=>setEditUserData({...editUserData, password: e.target.value})}
                    placeholder="Leave blank to preserve..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Role Type</label>
                  <select 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer" 
                    value={editUserData.role} 
                    disabled={isEditReadOnly} 
                    onChange={e=>setEditUserData({...editUserData, role: e.target.value})}
                  >
                    <option value="user">Standard User</option>
                    {(currentUser?.role === 'admin' || editUserData.role === 'admin') && (
                      <option value="admin">Administrator</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Permissions Checklist */}
              {editUserData.role === 'user' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Tick-Mark Permission Clearances</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{isEditReadOnly ? "View clearances" : "Modify clearances"}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {permissionsConfig.map(p => {
                      if (p.isSplit) {
                        return (
                          <div key={p.key} className="p-4 border border-slate-200 rounded-xl bg-slate-50/40 space-y-3 animate-fade-in">
                            <span className="text-[11px] font-black text-slate-800 block border-b border-slate-100 pb-1.5">{p.label}</span>
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={!!editUserData.access[p.key]} 
                                  disabled={isEditReadOnly}
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setEditUserData({
                                      ...editUserData, 
                                      access: { 
                                        ...editUserData.access, 
                                        [p.key]: val, 
                                        ...(val ? {} : { [p.editKey]: false }) 
                                      }
                                    });
                                  }}
                                  className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                                />
                                <span className="text-xs font-bold text-slate-600">{p.viewLabel}</span>
                              </label>
                              
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={!!editUserData.access[p.editKey]} 
                                  disabled={isEditReadOnly || !editUserData.access[p.key]}
                                  onChange={(e) => {
                                    setEditUserData({
                                      ...editUserData, 
                                      access: { ...editUserData.access, [p.editKey]: e.target.checked }
                                    });
                                  }}
                                  className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                                />
                                <span className="text-xs font-bold text-slate-650 disabled-label-style">{p.editLabel}</span>
                              </label>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <label key={p.key} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50/70 cursor-pointer select-none transition-colors h-[64px] animate-fade-in">
                            <input 
                              type="checkbox" 
                              checked={!!editUserData.access[p.key]} 
                              disabled={isEditReadOnly}
                              onChange={(e) => {
                                setEditUserData({
                                  ...editUserData, 
                                  access: { ...editUserData.access, [p.key]: e.target.checked }
                                });
                              }}
                              className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                            />
                            <span className="text-xs font-bold text-slate-700">{p.label}</span>
                          </label>
                        );
                      }
                    })}
                  </div>
                </div>
              )}

              {/* Location Access Section */}
              {editUserData.role === 'user' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Authorized Locations</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{isEditReadOnly ? "View assigned locations" : "Modify assigned locations"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {warehouses.map(w => {
                      const isChecked = editUserData.allowedWarehouses.includes(w._id);
                      return (
                        <label key={w._id} className={`flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/40 ${isEditReadOnly ? 'cursor-not-allowed opacity-75' : 'hover:bg-slate-50/70 cursor-pointer'} select-none transition-colors`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isEditReadOnly}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditUserData(prev => ({
                                ...prev,
                                allowedWarehouses: checked 
                                  ? [...prev.allowedWarehouses, w._id] 
                                  : prev.allowedWarehouses.filter(id => id !== w._id)
                              }));
                            }}
                            className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-700">{w.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">{w.code}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
                <button type="button" onClick={()=>setShowEditModal(false)} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-750 uppercase tracking-wider">Close</button>
                {!isEditReadOnly && <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md">Save Changes</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusCard = ({ icon, label, value, color, description }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/5",
    green: "bg-green-50 text-green-600 border-green-100 shadow-green-500/5"
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 select-none hover:-translate-y-0.5 transition-all">
      <div className={`p-3 rounded-xl border ${colors[color]} flex items-center justify-center flex-shrink-0 shadow-inner`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight truncate">{value}</p>
        {description && <p className="text-[10px] text-slate-400 font-bold tracking-tight mt-0.5">{description}</p>}
      </div>
    </div>
  );
};

export default UsersManagement;
