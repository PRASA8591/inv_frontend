import axios from 'axios';

// Read backend API URL from environment variable, fallback to localhost:5000
export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_URL = `${BACKEND_URL}/api`;

// Register global request interceptor to dynamically replace hardcoded backend url references
axios.interceptors.request.use(
  (config) => {
    if (config.url && config.url.includes('http://localhost:5000')) {
      // Replace hardcoded localhost base URL with the configured environment backend URL
      config.url = config.url.replace('http://localhost:5000', BACKEND_URL);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
