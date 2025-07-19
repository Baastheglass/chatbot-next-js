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

  console.log(`Making request to: ${endpoint}`);

  try {
    const response = await fetch(url, config);
    
    // Handle 401 unauthorized responses
    if (response.status === 401) {
      localStorage.removeItem('auth-token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    // Check if the response is ok
    if (!response.ok) {
      console.error(`Request failed: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Convenience methods for different HTTP verbs that return JSON
export const apiGet = async (endpoint, options = {}) => {
  const response = await apiRequest(endpoint, { ...options, method: 'GET' });
  if (!response) return null;
  return await response.json();
};

export const apiPost = async (endpoint, data, options = {}) => {
  const response = await apiRequest(endpoint, { 
    ...options, 
    method: 'POST', 
    body: JSON.stringify(data) 
  });
  if (!response) return null;
  return await response.json();
};

export const apiPut = async (endpoint, data, options = {}) => {
  const response = await apiRequest(endpoint, { 
    ...options, 
    method: 'PUT', 
    body: JSON.stringify(data) 
  });
  if (!response) return null;
  return await response.json();
};

export const apiDelete = async (endpoint, options = {}) => {
  const response = await apiRequest(endpoint, { ...options, method: 'DELETE' });
  if (!response) return null;
  return await response.json();
};

export { BACKEND_URL };