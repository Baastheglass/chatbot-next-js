"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const { data: session, status } = useSession();  // Check if already logged in
  const router = useRouter();
  const searchParams = useSearchParams();

  // If user is already authenticated (still within 7-day token), skip email form
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/chat");
    }
  }, [status, router]);
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'session_expired') {
        // Show a friendly message to the user
        // You can use your preferred notification system
        alert("Your session has expired. Please login again.");
    }
}, [searchParams]);


  // Show a spinner or status while checking session
  if (status === "loading") {
    return <div>Checking session...</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("Sending magic link...");

    try {
      // signIn with Email provider
      const result=await signIn("email", {
        email,
        redirect: false,
        userAgent: navigator.userAgent,
        callbackUrl: "/chat", // after successful login, go to /chat
      });
      if (result.error) {
        setStatusMessage("Email is not whitelisted.");
      } else {
        setStatusMessage("Check your inbox for a magic link!");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setStatusMessage("Error sending magic link.");
    }
  };


  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Sign in via Email</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Your email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition duration-200"
          >
            Send Magic Link
          </button>
        </form>
        {statusMessage && (
          <div className="mt-4 text-center text-gray-600">{statusMessage}</div>
        )}
      </div>
    </div>
  );
}















