"use client";
import { createContext, useContext, useState, useEffect } from 'react';

// API utility specifically for auth to avoid circular dependency
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://consultant.axonbuild.com';

const authApiRequest = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  
  // Safely get token with proper checks
  let token = null;
  try {
    if (typeof window !== 'undefined' && localStorage) {
      token = localStorage.getItem('auth-token');
    }
  } catch (error) {
    console.warn('Unable to access localStorage:', error);
  }
  
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

const AuthContext = createContext();

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Safely access localStorage
      let token = null;
      try {
        if (typeof window !== 'undefined' && localStorage) {
          token = localStorage.getItem('auth-token');
        }
      } catch (error) {
        console.warn('Unable to access localStorage:', error);
        setUser(null);
        setLoading(false);
        return;
      }
      
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
          try {
            if (typeof window !== 'undefined' && localStorage) {
              localStorage.removeItem('auth-token');
            }
          } catch (e) { console.warn('Unable to clear localStorage:', e); }
        }
      } else {
        console.log('❌ Auth check failed: Invalid response from backend');
        setUser(null);
        try {
          if (typeof window !== 'undefined' && localStorage) {
            localStorage.removeItem('auth-token');
          }
        } catch (e) { console.warn('Unable to clear localStorage:', e); }
      }
    } catch (error) {
      console.error('🚨 Auth check error:', error);
      setUser(null);
      try {
        if (typeof window !== 'undefined' && localStorage) {
          localStorage.removeItem('auth-token');
        }
      } catch (e) { console.warn('Unable to clear localStorage:', e); }
    } finally {
      setLoading(false);
      console.log('🏁 Auth check completed');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');
      
      // Clear authentication data safely
      try {
        if (typeof window !== 'undefined' && localStorage) {
          localStorage.removeItem('auth-token');
        }
      } catch (error) {
        console.warn('Unable to clear localStorage:', error);
      }
      
      // Also clear the cookie safely
      try {
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      } catch (error) {
        console.warn('Unable to clear cookie:', error);
      }
      
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
}

export { useAuth, AuthProvider };
