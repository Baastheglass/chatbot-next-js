"use client";
import React from "react";
import ChatInterface from "../../components/ChatInterface";

export default function ChatPage() {
  // No authentication required - direct access to chat
  return (
    <div>
      <ChatInterface />
    </div>
  );
}
