"use client";

import axios from "axios";

const backendURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
    baseURL: backendURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false, // Disable credentials since no auth needed
  });
  
  // Simple request interceptor without authentication
  api.interceptors.request.use(
    async (config) => {
      console.log('Making request to:', config.url); // Debug log
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
  
  // Simple response interceptor without auth redirects
  api.interceptors.response.use(
    (response) => {
      console.log('Response received:', response.status);
      return response;
    },
    async (error) => {
        console.error("Request error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code
        });
        
        // Handle network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          throw new Error('Unable to connect to server. Please check your internet connection and try again.');
        }
        
        return Promise.reject(error);
    }
);
export async function apiGet(url, config = {}) {
  try {
      const response = await api.get(url, config);
      return response.data;
  } catch (error) {
      throw error; // Let interceptor handle it
  }
}

export async function apiPost(url, data = {}, config = {}) {
  try {
      const response = await api.post(url, data, config);
      return response.data;
  } catch (error) {
      console.error('API Post Error:', error.response?.data || error.message);
      throw error; // Let interceptor handle it
  }
}

export default api; 