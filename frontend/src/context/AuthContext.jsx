import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('supplychain360_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('supplychain360_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate session on boot or auto-login with default admin if none set
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('supplychain360_token');
      if (savedToken) {
        try {
          const res = await api.getMe();
          if (res.success) {
            setUser(res.user);
            localStorage.setItem('supplychain360_user', JSON.stringify(res.user));
          } else {
            logout();
          }
        } catch {
          // Token invalid or expired
          logout();
        }
      } else {
        // Automatically log in as default Admin for seamless first-time evaluation experience!
        try {
          const res = await api.login('admin', 'Password123');
          if (res.success) {
            setToken(res.token);
            setUser(res.user);
            localStorage.setItem('supplychain360_token', res.token);
            localStorage.setItem('supplychain360_user', JSON.stringify(res.user));
          }
        } catch {
          // Ignore
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('supplychain360_token', res.token);
      localStorage.setItem('supplychain360_user', JSON.stringify(res.user));
      setIsLoginModalOpen(false);
      return res;
    }
    throw new Error(res.message || 'Authentication failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('supplychain360_token');
    localStorage.removeItem('supplychain360_user');
  };

  const role = user?.role || 'viewer';

  const value = {
    user,
    token,
    role,
    isLoggedIn: !!user,
    isAdmin: role === 'admin',
    canManageInventory: ['admin', 'inventory_manager'].includes(role),
    canManageOrders: ['admin', 'operations_manager'].includes(role),
    canManageSettings: role === 'admin',
    isViewer: role === 'viewer',
    login,
    logout,
    isLoginModalOpen,
    setIsLoginModalOpen,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
