"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// API utility specifically for auth to avoid circular dependency
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://consultant.axonbuild.com';

const authApiRequest = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  const token = localStorage.getItem('auth-token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  console.log(`Making auth request to: ${endpoint}`);

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error('Auth API request failed:', error);
    throw error;
  }
};

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
      
      // Use the auth-specific API client to avoid circular dependency
      const response = await authApiRequest('/auth/me', {
        method: 'GET',
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
      
      // Clear authentication data
      localStorage.removeItem('auth-token');
      
      // Also clear the cookie
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Update user state
      setUser(null);
      
      console.log('✅ Logout completed');
      
      // Use window.location instead of router.push to avoid hook issues
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback navigation even if there's an error
      window.location.href = '/login';
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