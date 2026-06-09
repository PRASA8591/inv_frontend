import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure Top-Level Global Interceptor immediately to block race conditions during child component mounting.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Intercept 401 globally across all system node instances
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('token');
      // Direct hard routing to /login wipes all state vectors safely
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_URL = 'https://inv-backend-v7ld.onrender.com/api';

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      loadUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (token) => {
    try {
      const res = await axios.get(`${API_URL}/auth/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setIsAuthenticated(true);
    } catch (err) {
      sessionStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      sessionStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


