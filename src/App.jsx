import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ShieldAlert } from 'lucide-react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ItemsManagement from './pages/ItemsManagement';
import StockManagement from './pages/StockManagement';
import POS from './pages/POS';
import PriceManagement from './pages/PriceManagement';
import UsersManagement from './pages/UsersManagement';
import Reports from './pages/Reports';
import SystemSettings from './pages/SystemSettings';
import CRM from './pages/CRM';
import SupplyChain from './pages/SupplyChain';
import Invoices from './pages/Invoices';
import DirectStockAdd from './pages/DirectStockAdd';
import Activation from './pages/Activation';
import LocationsManagement from './pages/LocationsManagement';

// Core CSS & Layout wrapper
import './index.css';
import Layout from './components/Layout';

const PrivateRoute = ({ children, accessKey, requiredLevel = 'view' }) => {
  const { isAuthenticated, loading, user, logout } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Access Authorization verification logic
  let hasAccess = false;
  if (user?.role === 'admin') {
    hasAccess = true;
  } else if (!accessKey) {
    hasAccess = true;
  } else if (user?.access) {
    if (requiredLevel === 'full') {
      const editKey = `${accessKey}_edit`;
      if (user.access[editKey] !== undefined) {
        hasAccess = user.access[editKey] === true;
      } else {
        hasAccess = user.access[accessKey] === true;
      }
    } else { // 'view'
      hasAccess = user.access[accessKey] === true;
    }
  }

  if (!hasAccess) {
    logout();
    return <Navigate to="/login" replace />;
  }

  // Authorized render path
  return <Layout>{children}</Layout>;
};

const AdminOnlyRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <SettingsProvider>
            <Router>
              <Routes>
            {/* Guest only Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Authenticated Secured System Node Routes */}
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />} 
            />

            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute accessKey="dashboard">
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/dashboard/bills" 
              element={
                <PrivateRoute accessKey="dashboard">
                  <Dashboard />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/dashboard/bills/:billId" 
              element={
                <PrivateRoute accessKey="dashboard">
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/items" 
              element={
                <PrivateRoute accessKey="items">
                  <ItemsManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/items/edit/:itemName" 
              element={
                <PrivateRoute accessKey="items">
                  <ItemsManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/stock/direct" 
              element={
                <PrivateRoute accessKey="direct_stock">
                  <DirectStockAdd />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/stock" 
              element={
                <PrivateRoute accessKey="stock">
                  <StockManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/stock/edit/:itemName" 
              element={
                <PrivateRoute accessKey="stock">
                  <StockManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/pos" 
              element={
                <PrivateRoute accessKey="pos">
                  <POS />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/price" 
              element={
                <PrivateRoute accessKey="price">
                  <PriceManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/price/edit/:itemName" 
              element={
                <PrivateRoute accessKey="price">
                  <PriceManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/users" 
              element={
                <PrivateRoute accessKey="users">
                  <UsersManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/reports" 
              element={
                <PrivateRoute accessKey="reports">
                  <Reports />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/crm" 
              element={
                <PrivateRoute accessKey="crm">
                  <CRM />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/supply" 
              element={
                <PrivateRoute accessKey="supply">
                  <Navigate to="/supply/purchaseorder" replace />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/supply/:subpage/:docNumber?" 
              element={
                <PrivateRoute accessKey="supply">
                  <SupplyChain />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/invoices" 
              element={
                <PrivateRoute accessKey="invoices">
                  <Invoices />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/settings" 
              element={
                <PrivateRoute accessKey="settings">
                  <SystemSettings />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/locations" 
              element={
                <PrivateRoute accessKey="settings">
                  <LocationsManagement />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/activation" 
              element={
                <PrivateRoute>
                  <AdminOnlyRoute>
                    <Activation />
                  </AdminOnlyRoute>
                </PrivateRoute>
              } 
            />

            {/* Wildcard Fallback Re-route */}
            <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SettingsProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
