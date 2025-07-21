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

    // Handle 403 forbidden responses
    if (response.status === 403) {
      console.error('Access forbidden - user may not own this resource');
      throw new Error(`HTTP 403: Access forbidden. You don't have permission to access this resource.`);
    }

    // Check if the response is ok
    if (!response.ok) {
      console.error(`Request failed: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    // Re-throw with more context
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to ${BACKEND_URL}. Please check your internet connection and try again.`);
    }
    throw error;
  }
};

// Convenience methods for different HTTP verbs that return JSON
export const apiGet = async (endpoint, options = {}) => {
  try {
    const response = await apiRequest(endpoint, { ...options, method: 'GET' });
    if (!response) return null;
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON, returning response object');
      return { success: false, error: 'Invalid response format' };
    }
    
    return await response.json();
  } catch (error) {
    if (error.message.includes('json')) {
      console.error('JSON parsing error:', error);
      throw new Error('Server returned invalid response format');
    }
    throw error;
  }
};

export const apiPost = async (endpoint, data, options = {}) => {
  try {
    const response = await apiRequest(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
    if (!response) return null;
    
    // Check if response has content to parse
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON, returning response object');
      return { success: false, error: 'Invalid response format' };
    }
    
    return await response.json();
  } catch (error) {
    if (error.message.includes('json')) {
      console.error('JSON parsing error:', error);
      throw new Error('Server returned invalid response format');
    }
    throw error;
  }
};

export const apiPut = async (endpoint, data, options = {}) => {
  try {
    const response = await apiRequest(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
    if (!response) return null;
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON, returning response object');
      return { success: false, error: 'Invalid response format' };
    }
    
    return await response.json();
  } catch (error) {
    if (error.message.includes('json')) {
      console.error('JSON parsing error:', error);
      throw new Error('Server returned invalid response format');
    }
    throw error;
  }
};

export const apiDelete = async (endpoint, options = {}) => {
  try {
    const response = await apiRequest(endpoint, { ...options, method: 'DELETE' });
    if (!response) return null;
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON, returning response object');
      return { success: false, error: 'Invalid response format' };
    }
    
    return await response.json();
  } catch (error) {
    if (error.message.includes('json')) {
      console.error('JSON parsing error:', error);
      throw new Error('Server returned invalid response format');
    }
    throw error;
  }
};

export { BACKEND_URL };