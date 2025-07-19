"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from './api-client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.log('🔍 No auth token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('🔍 Checking authentication with backend...');
      
      // Use the centralized API client instead of hardcoded localhost
      const response = await apiRequest('/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ Auth check successful:', data.user?.username);
        if (data.success) {
          setUser(data.user);
        } else {
          console.log('❌ Auth check failed: Invalid response');
          setUser(null);
          localStorage.removeItem('auth-token');
        }
      } else {
        console.log('❌ Auth check failed: Invalid response from backend');
        setUser(null);
        localStorage.removeItem('auth-token');
      }
    } catch (error) {
      console.error('🚨 Auth check error:', error);
      setUser(null);
      localStorage.removeItem('auth-token');
    } finally {
      setLoading(false);
      console.log('🏁 Auth check completed');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');
      localStorage.removeItem('auth-token');
      // Also clear the cookie
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      setUser(null);
      router.push('/login');
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes (like after login)
    const handleAuthStateChange = () => {
      console.log('🔄 Auth state change detected, rechecking authentication...');
      checkAuth();
    };
    
    window.addEventListener('authStateChanged', handleAuthStateChange);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  const value = {
    user,
    loading,
    logout,
    refetchUser: checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};