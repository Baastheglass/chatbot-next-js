"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from '@/lib/api-client';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("🔄 Login attempt started for user:", formData.username);

    try {
      const response = await apiPost('/auth/login', {
        username: formData.username,
        password: formData.password
      });

      console.log("📡 Login response received:", {
        status: response?.status,
        ok: response?.ok,
        responseExists: !!response
      });

      // Check if response exists (apiPost returns null on 401)
      if (!response) {
        console.error("❌ Login failed: No response received (likely 401)");
        setError("Authentication failed. Please check your credentials.");
        return;
      }

      const data = await response.json();
      console.log("📦 Login response data:", {
        success: data.success,
        hasUser: !!data.user,
        hasToken: !!(data.user?.token),
        username: data.user?.username
      });

      if (response.ok && data.success) {
        console.log("✅ Login successful for user:", data.user.username);
        
        // Store token in localStorage
        if (data.user?.token) {
          localStorage.setItem('auth-token', data.user.token);
          console.log("🔑 Auth token stored in localStorage");
        } else {
          console.warn("⚠️ No token received in login response");
        }
        
        console.log("🚀 Redirecting to Stratos chat...");
        // Redirect to chat page
        router.push("/chat");
        
        // Additional success feedback
        console.log("🎉 Login process completed successfully!");
        
      } else {
        console.error("❌ Login failed with response:", data);
        setError(data.detail || data.error || "Login failed");
      }
    } catch (error) {
      console.error("🚨 Login error occurred:", {
        message: error.message,
        stack: error.stack,
        error: error
      });
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      console.log("🏁 Login attempt finished");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}