"use client";
import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingScreen from "../../components/LoadingScreen";
import ChatInterface from "../../components/ChatInterface";

export default function ChatPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") {
    return null; // Return null while redirecting
  }

  return (
    <div>
      <ChatInterface />
    </div>
  );
}
