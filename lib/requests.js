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
    (response) => response,
    async (error) => {
        console.log("Request error:", error.code || error.response?.status);
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
      throw error; // Let interceptor handle it
  }
}

export default api; 