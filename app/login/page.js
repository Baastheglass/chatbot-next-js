"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from '@/lib/api-client';
import { Sparkles, User, Lock, Eye, EyeOff } from 'lucide-react';

const { useState } = React;

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const data = await apiPost('/auth/login', {
        username: formData.username,
        password: formData.password
      });

      console.log("📡 Login response received:", {
        dataExists: !!data,
        success: data?.success,
        hasUser: !!data?.user
      });

      // Check if response exists (apiPost returns null on 401)
      if (!data) {
        console.error("❌ Login failed: No response received (likely 401)");
        setError("Authentication failed. Please check your credentials.");
        return;
      }

      console.log("📦 Login response data:", {
        success: data.success,
        hasUser: !!data.user,
        hasToken: !!(data.user?.token),
        username: data.user?.username
      });

      if (data.success) {
        console.log("✅ Login successful for user:", data.user.username);
        
        // Store token in both localStorage and cookies
        if (data.user?.token) {
          // Store in localStorage (for frontend use)
          localStorage.setItem('auth-token', data.user.token);
          console.log("🔑 Auth token stored in localStorage");
          
          // Set cookie with proper attributes for middleware
          const isSecure = window.location.protocol === 'https:';
          const cookieString = `auth-token=${data.user.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
          document.cookie = cookieString;
          console.log("🍪 Auth token set as cookie for middleware", { isSecure, cookieString: cookieString.substring(0, 50) + '...' });
        } else {
          console.warn("⚠️ No token received in login response");
        }
        
        console.log("🚀 Redirecting to Stratos chat...");
        
        // Force auth context to refresh after successful login
        if (typeof window !== 'undefined') {
          // Dispatch a custom event to notify auth context
          window.dispatchEvent(new CustomEvent('authStateChanged'));
        }
        
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
      
      // Provide specific error messages based on error type
      if (error.message.includes('401')) {
        setError("Invalid username or password. Please try again.");
      } else if (error.message.includes('404')) {
        setError("User not found. Please check your username or sign up.");
      } else if (error.message.includes('500')) {
        setError("Server error. Please try again later.");
      } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
        setError("Unable to connect to server. Please check your internet connection.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
      console.log("🏁 Login attempt finished");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Main card */}
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 transform transition-all duration-500 hover:scale-[1.02]">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-400 mt-2">Sign in to continue to Stratos</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-400" />
                Username
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 outline-none"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-400" />
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-shake">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
              >
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}