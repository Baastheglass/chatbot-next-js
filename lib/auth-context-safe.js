"use client";

// Import React components
const React = require('react');
const { createContext, useContext, useState, useEffect } = React;

// Constants for auth
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://consultant.axonbuild.com';

// Create context first
const AuthContext = createContext(null);

// Safe localStorage utility
const getStorageToken = () => {
  let token = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      token = window.localStorage.getItem('auth-token');
    }
  } catch (error) {
    console.warn('Storage access failed:', error);
  }
  return token;
};

// Safe localStorage removal
const removeStorageToken = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('auth-token');
    }
  } catch (error) {
    console.warn('Storage removal failed:', error);
  }
};

// Auth API request function
const makeAuthRequest = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  const token = getStorageToken();
  
  const config = {
    method: 'GET',
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

// Auth provider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = getStorageToken();
      if (!token) {
        console.log('🔍 No auth token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('🔍 Checking authentication with backend...');
      
      const response = await makeAuthRequest('/auth/me');

      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ Auth check successful:', data.user?.username);
        if (data.success) {
          setUser(data.user);
        } else {
          console.log('❌ Auth check failed: Invalid response');
          setUser(null);
          removeStorageToken();
        }
      } else {
        console.log('❌ Auth check failed: Invalid response from backend');
        setUser(null);
        removeStorageToken();
      }
    } catch (error) {
      console.error('🚨 Auth check error:', error);
      setUser(null);
      removeStorageToken();
    } finally {
      setLoading(false);
      console.log('🏁 Auth check completed');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');
      
      removeStorageToken();
      
      try {
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      } catch (error) {
        console.warn('Unable to clear cookie:', error);
      }
      
      setUser(null);
      console.log('✅ Logout completed');
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  useEffect(() => {
    checkAuth();
    
    const handleAuthStateChange = () => {
      console.log('🔄 Auth state change detected, rechecking authentication...');
      checkAuth();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('authStateChanged', handleAuthStateChange);
      
      return () => {
        window.removeEventListener('authStateChanged', handleAuthStateChange);
      };
    }
  }, []);

  const contextValue = {
    user,
    loading,
    logout,
    refetchUser: checkAuth
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
};

// Hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export using module.exports for better compatibility
module.exports = {
  AuthProvider,
  useAuth
};
