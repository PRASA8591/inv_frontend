import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    companyName: 'Apex Supply Chain Inc.',
    currency: 'USD',
    currencySymbol: '$',
    taxRate: 8.0,
    address: 'San Francisco, CA',
    theme: 'light',
    glassmorphism: true,
    animations: true,
    shopLogo: null
  });
  const [loading, setLoading] = useState(false);

  const API_URL = 'https://invtory-backend.onrender.com/api/settings';

  const fetchPublicSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/public`);
      setSettings(prev => ({
        ...prev,
        companyName: res.data.companyName || prev.companyName,
        shopLogo: res.data.shopLogo || null
      }));
    } catch (err) {
      console.error("Failed to fetch public settings:", err);
    }
  };

  const fetchSettings = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings automatically when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    } else {
      fetchPublicSettings();
    }
  }, [isAuthenticated]);

  const updateSettings = async (updatedData) => {
    const token = sessionStorage.getItem('token');
    if (!token) return { success: false, message: 'No authentication' };

    try {
      const res = await axios.put(API_URL, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(res.data); // Update local context state directly
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Update failed'
      };
    }
  };

  const formatCurrency = (amount) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return `${settings.currencySymbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, fetchSettings, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
