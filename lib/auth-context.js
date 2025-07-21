"use client";

// Import React with explicit assignment
import * as React from 'react';

// Extract functions explicitly to avoid hoisting issues
const createContext = React.createContext;
const useContext = React.useContext;
const useState = React.useState;
const useEffect = React.useEffect;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://consultant.axonbuild.com';

const AuthContext = createContext();

// Function declarations to avoid hoisting issues
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

  const safeLocalStorage = {
    getItem: (key) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (error) {
        console.warn('localStorage access failed:', error);
      }
      return null;
    },
    removeItem: (key) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('localStorage removal failed:', error);
      }
    }
  };

  const authFetch = async (endpoint, options = {}) => {
    const url = `${BACKEND_URL}${endpoint}`;
    const token = safeLocalStorage.getItem('auth-token');
    
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

    const response = await fetch(url, config);
    return response;
  };

  const checkAuth = async () => {
    try {
      const token = safeLocalStorage.getItem('auth-token');
      if (!token) {
        console.log('🔍 No auth token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('🔍 Checking authentication with backend...');
      
      const response = await authFetch('/auth/me');

      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ Auth check successful:', data.user?.username);
        if (data.success) {
          setUser(data.user);
        } else {
          console.log('❌ Auth check failed: Invalid response');
          setUser(null);
          safeLocalStorage.removeItem('auth-token');
        }
      } else {
        console.log('❌ Auth check failed: Invalid response from backend');
        setUser(null);
        safeLocalStorage.removeItem('auth-token');
      }
    } catch (error) {
      console.error('🚨 Auth check error:', error);
      setUser(null);
      safeLocalStorage.removeItem('auth-token');
    } finally {
      setLoading(false);
      console.log('🏁 Auth check completed');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');
      
      safeLocalStorage.removeItem('auth-token');
      
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

  const value = {
    user,
    loading,
    logout,
    refetchUser: checkAuth
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// Export functions explicitly at the end
export { useAuth, AuthProvider };
