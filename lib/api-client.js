// API utility for making authenticated requests to the Python backend
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://consultant.axonbuild.com';

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth-token');
  }
  return null;
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Handle 401 unauthorized responses
    if (response.status === 401) {
      localStorage.removeItem('auth-token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null; // Return null instead of undefined
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Convenience methods for different HTTP verbs
export const apiGet = (endpoint, options = {}) => 
  apiRequest(endpoint, { ...options, method: 'GET' });

export const apiPost = (endpoint, data, options = {}) => 
  apiRequest(endpoint, { 
    ...options, 
    method: 'POST', 
    body: JSON.stringify(data) 
  });

export const apiPut = (endpoint, data, options = {}) => 
  apiRequest(endpoint, { 
    ...options, 
    method: 'PUT', 
    body: JSON.stringify(data) 
  });

export const apiDelete = (endpoint, options = {}) => 
  apiRequest(endpoint, { ...options, method: 'DELETE' });

export { BACKEND_URL };