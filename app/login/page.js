"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // No login required - redirect directly to chat
    router.push("/chat");
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Redirecting to Chat...</h1>
        <div className="text-center text-gray-600">
          No authentication required. Redirecting to chat...
        </div>
      </div>
    </div>
  );
}