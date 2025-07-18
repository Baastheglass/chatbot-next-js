"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
 
  useEffect(() => {
    if (loading) return; // Wait for auth to load
    
    if (user) {
      // User is authenticated, redirect to chat
      router.push("/chat");
    } else {
      // User is not authenticated, redirect to login
      router.push("/login");
    }
  }, [router, user, loading]);
 
  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
 
  return null;
}