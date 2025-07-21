import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost, apiGet } from "@/lib/api-client";
import { randomPick, sleep } from '@/lib/utils';

const { useState, useEffect, useRef } = React;
import { useAuth } from '@/lib/auth-context';

const ChatInterfaceSimple = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Create session when component mounts and user is available
  useEffect(() => {
    if (!sessionId && user) {
      const createSession = async () => {
        try {
          const data = await apiPost("/create_session");
          setSessionId(data.session_id);
          console.log('Session created:', data.session_id);
        } catch (error) {
          console.error('Error creating session:', error);
        }
      };
      createSession();
    }
  }, [user, sessionId]);

  const textStreamRoutine = async (response) => {
    let loadingMsgRemoved = false;

    for (let char of response) {
      setMessages(prev => {
        if (!loadingMsgRemoved) {
          loadingMsgRemoved = true;
          prev = [...prev.slice(0, -1), { type: 'bot', content: '' }];
        }

        let lastmsg = prev[prev.length - 1].content;
        let newmsg = lastmsg + char;
        
        return [
          ...prev.slice(0, -1), 
          { 
            type: 'bot', 
            content: newmsg 
          }
        ]
      })

      await sleep(5);
    }
  }

  // Show elegant loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center animate-fade-in">
          <p className="mt-6 text-gray-300 text-lg font-medium animate-pulse">Loading Stratos...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, show elegant error
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center animate-fade-in">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 backdrop-blur-sm">
            <p className="text-red-400 text-lg font-medium">Authentication required</p>
            <p className="text-gray-400 mt-2">Please log in to continue</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-slate-700/50 bg-slate-800/20">
          <h2 className="text-xl font-semibold text-white">Chat Interface</h2>
          <p className="text-sm text-gray-400">User: {user?.username}</p>
        </div>
        <div className="flex-1 p-6">
          <p className="text-gray-300">Chat interface loading successfully!</p>
          
          <div className="mt-4">
            <div className="flex space-x-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-slate-700/30 border-slate-600/30 text-white"
              />
              <Button 
                onClick={async () => {
                  setMessages(prev => [...prev, 
                    { type: 'user', content: inputText },
                    { type: 'bot', content: '...' }
                  ]);
                  
                  // Test streaming
                  await textStreamRoutine("Hello! This is a test response.");
                  setInputText('');
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Send
              </Button>
            </div>
            
            <div className="mt-4">
              {messages.map((msg, idx) => (
                <div key={idx} className="mb-2 p-2 bg-slate-700/20 rounded">
                  <strong>{msg.type}:</strong> {msg.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterfaceSimple;
