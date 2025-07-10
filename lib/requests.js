"use client";

import axios from "axios";
import { getSession } from "next-auth/react";
import { signOut } from "next-auth/react";

const backendURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
    baseURL: backendURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
    credentials: 'include'
  });
  
  // Add a request interceptor
  api.interceptors.request.use(
    async (config) => {
      try {
        const session = await getSession();
        console.log('Current session:', session); // Debug log
        
        if (session?.user?.email) {
          // Create a simple token format that the backend can verify
          const tokenData = {
            email: session.user.email,
            sessionId: session.sessionId || 'default-session',
            timestamp: Date.now()
          };
          
          const token = btoa(JSON.stringify(tokenData));
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Setting Authorization header for user:', session.user.email); // Debug log
        } else {
          console.log('No session or email found'); // Debug log
        }
      } catch (error) {
        console.error('Error in request interceptor:', error);
      }
      
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error); // Debug log
      return Promise.reject(error);
    }
  );
  
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Check for network errors (CORS, connection refused etc.)
        if (error.code === "ERR_NETWORK" || 
            (error.response && (error.response.status === 401 || error.response.status === 403))) {
            
            console.log("Logging out due to:", error.code || error.response?.status);
            
            localStorage.clear(); // Clear any stored data
            sessionStorage.clear();
            try {
                await signOut({ redirect: false });
            } catch (e) {
                console.error("SignOut error:", e);
            }

            return Promise.reject(error);
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
      throw error; // Let interceptor handle it
  }
}

export default api; 