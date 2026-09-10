import axios from 'axios';

const normalizeApiBaseUrl = (configuredUrl) => {
  const value = (configuredUrl || '/api').trim().replace(/\/+$/, '');

  // Accept either the API origin or an API URL, but always expose one /api prefix.
  if (value === '/api' || value.endsWith('/api')) {
    return value.replace(/(?:\/api)+$/, '/api');
  }

  return `${value}/api`;
};

const API = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL)
});

// Request interceptor to attach JWT bearer token
API.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch (err) {
      console.error('Error parsing token from localStorage', err);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;
