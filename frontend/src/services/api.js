import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
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
