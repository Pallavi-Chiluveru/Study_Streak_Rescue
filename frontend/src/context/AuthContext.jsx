import React, { useState, useEffect } from 'react';
import { AuthContext } from './authContext.js';
import API from '../services/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (user && user.token) {
        try {
          const res = await API.get('/auth/me');
          setUser(prev => prev?.token === user.token ? { ...prev, ...res.data } : prev);
        } catch (error) {

          logout();
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    setUser(res.data);
    localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await API.post('/auth/register', { name, email, password });
    setUser(res.data);
    localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  };

  const updateUserStats = (newStats) => {
    setUser(prev => {
      const updated = { ...prev, ...newStats };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserStats }}>
      {children}
    </AuthContext.Provider>
  );
};
