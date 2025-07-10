"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
 
  useEffect(() => {
    // Always redirect to chat page - no authentication required
    router.push("/chat");
  }, [router]);
 
  return null;
}