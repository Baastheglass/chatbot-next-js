import React, { useState, useEffect, useRef } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SignOutButton from './SignOutButton';
import OpenRouterSettings from './OpenRouterSettings';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConfirmDialog from './ui/confirm-dialog';
import InputDialog from './ui/input-dialog';
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import api, { apiPost,apiGet } from "@/lib/requests";
import { Menu, MoreVertical, Trash2, SendIcon } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { KeyboardAwareContainer } from './ui/keyboard-aware-container';
import { randomPick, sleep } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";  // FastAPI backend URL

const ChatInterface = () => {
  const scrollDiv = useRef();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null); 
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    chatId: null,
    title: '',
    message: ''
  });
  // Input dialog state for new chat
  const [inputDialog, setInputDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    placeholder: ''
  });
  // OpenRouter settings state
  const [openRouterSettings, setOpenRouterSettings] = useState({
    apiKey: '',
    model: 'deepseek/deepseek-chat:free',
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  });
  // Authentication disabled - no session/user email required
  const userEmail = "demo@example.com"; // Demo user for development 

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await apiGet("/chats");
        const chatList = data.chats || [];
        setChats(chatList);
        
        // If no chats exist, create a default one
        if (chatList.length === 0) {
          console.log('No chats found, creating default chat...');
          const newChatData = await apiPost("/chats", {
            user_email: userEmail,
            title: "New Conversation"
          });
          
          if (newChatData.chatId) {
            setSelectedChat(newChatData.chatId);
            // Refresh chat list
            const updatedData = await apiGet("/chats");
            setChats(updatedData.chats || []);
          }
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };
    fetchChats();
  }, []);

  const handleNewChat = async () => {
    // Show custom input dialog
    setInputDialog({
      isOpen: true,
      title: 'Create New Chat',
      message: 'Enter a name for your new conversation:',
      placeholder: 'e.g., Marketing Strategy, Product Development...'
    });
  };

  const confirmCreateChat = async (chatTitle) => {
    try {
      const data = await apiPost("/chats", {
        user_email: userEmail,
        title: chatTitle
      });
  
      if (data.chatId) {
        setSelectedChat(data.chatId);
        setMessages([]);
  
        // Just reload chats so the new chat appears without refreshing
        const updated = await apiGet("/chats");
        setChats(updated.chats || []);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };
  const handleDeleteChat = async (chatId) => {
    // Find the chat to get its title
    const chat = chats.find(c => c.chatId === chatId);
    const chatTitle = chat ? chat.title : 'this chat';
    
    // Show custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      chatId: chatId,
      title: 'Delete Chat',
      message: `Are you sure you want to delete "${chatTitle}"? This action cannot be undone.`
    });
  };

  const confirmDeleteChat = async () => {
    const chatId = confirmDialog.chatId;
    
    try {
      const response = await apiPost(`/chats/${chatId}/delete`);
      if (response.status === "ok") {
        // remove from local state or refresh if needed
        setChats((oldChats) => oldChats.filter((c) => c.chatId !== chatId));
        setMessages([]);
        setSelectedChat(null);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };
  const handleChatSelect = async (chatId) => {
    setSelectedChat(chatId);
    setIsLoading(true);
    setMessages([{ type: 'assistant', content: 'Loading...' }]);
    
    try {
      await apiGet(`/chats/${chatId}/load_recent_context?sessionId=${sessionId}`);
      const data = await apiGet(`/chats/${chatId}/messages`);
      console.log("data: ",data);
      
      if (data.messages) {
        // Map messages for display
        setMessages(data.messages.map(m => ({
          type: m.role,
          content: m.content
        })));
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([{ type: 'assistant', content: 'Failed to load messages.' }]);
    } finally {
      setIsLoading(false);
    }
  };
  const scrollToBottom = () => {
    if (scrollDiv.current) {
      scrollDiv.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  useEffect(() => { // { changed code }
    const createSession = async () => {
      try{
        const data = await apiPost("/create_session");
        setSessionId(data.session_id);
      } catch (error) {
        console.error('Error creating session:', error);
      }
    };
    createSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const textStreamRoutine = async (response) => {
    let loadingMsgRemoved = false;

    for (let char of response) {
      setMessages(prev => {
        if (!loadingMsgRemoved) {
          // remove the loading message '...'
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

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    try {
        setIsLoading(true);

        // Create chat if none selected
        let currentChatId = selectedChat;
        if (!currentChatId) {
            console.log('No chat selected, creating new chat...');
            const chatData = await apiPost("/chats", {
                user_email: userEmail,
                title: inputText.slice(0, 50) + (inputText.length > 50 ? "..." : "")
            });
            currentChatId = chatData.chatId;
            setSelectedChat(currentChatId);
            
            // Refresh chat list
            const updatedChats = await apiGet("/chats");
            setChats(updatedChats.chats || []);
        }

        // Save user message to DB
        await apiPost(`/chats/${currentChatId}/messages`, {
            role: 'user',
            content: inputText
        });

        // Add user message immediately to UI
        setMessages(prev => [...prev, 
            { type: 'user', content: inputText }, 
            { type: 'assistant', content: '...' }
        ]);

        // Debug OpenRouter settings
        console.log('OpenRouter Settings:', {
            apiKey: openRouterSettings.apiKey ? 'Present' : 'Missing',
            model: openRouterSettings.model,
            systemPrompt: openRouterSettings.systemPrompt ? 'Present' : 'Missing'
        });

        // Get response from chat endpoint with proper headers
        const data = await apiPost("/chat", { 
            message: inputText, 
            session_id: sessionId 
        }, {
            headers: {
                'X-OpenRouter-API-Key': openRouterSettings.apiKey,
                'X-OpenRouter-Model': openRouterSettings.model,
                'X-System-Prompt': encodeURIComponent(openRouterSettings.systemPrompt || '')
            }
        });
        
        // Handle response and save to DB
        if (data.type) {
            switch (data.type) {
                default:
                    // Save regular message to DB
                    await apiPost(`/chats/${currentChatId}/messages`, {
                        role: 'assistant',
                        content: data.response
                    });
                    await textStreamRoutine(data.response);
            }
        } else {
            // Handle regular text response
            await apiPost(`/chats/${currentChatId}/messages`, {
                role: 'assistant',
                content: data.response
            });
            await textStreamRoutine(data.response);
        }

        setInputText('');
        
    } catch (error) {
        console.error('Error:', error);
        await textStreamRoutine('Sorry, something went wrong. Please try again.');
    } finally {
        setIsLoading(false);
    }
};
  // Add the handleCheckTopic function
  const renderMessage = (message) => {
    // Handle loading messages
  if (message.attachmentType === 'loading') {
      return (
          <div className="flex items-center space-x-2 text-[#8696a0]">
              <div className="animate-pulse">•••</div>
              <span className="text-sm">{message.content}</span>
          </div>
      );
  }
  return (
    <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
            // Override default elements with custom styling
            p: ({children}) => (
                <p className="text-[#e9edef]">{children}</p>
            ),
            strong: ({children}) => (
                <strong className="font-bold text-white">{children}</strong>
            ),
            em: ({children}) => (
                <em className="italic text-white">{children}</em>
            ),
            h1: ({children}) => (
                <h1 className="text-xl font-bold text-white mb-2">{children}</h1>
            ),
            h2: ({children}) => (
                <h2 className="text-lg font-bold text-white mb-2">{children}</h2>
            ),
            h3: ({children}) => (
                <h3 className="text-base font-bold text-white mb-1">{children}</h3>
            ),
            ul: ({children}) => (
              <ul className="list-disc list-inside space-y-4 text-[#e9edef] mb-2">{children}</ul>            ),
            ol: ({children}) => (
                <ol className="list-decimal list-inside text-[#e9edef] mb-2">{children}</ol>
            ),
            li: ({children}) => (
              <li className="text-[#e9edef] flex items-start">
                  <span className="mr-2">•</span>
                  <span className="flex-1">{children}</span>
              </li>
            ),
            code: ({node, inline, className, children, ...props}) => (
                <code
                    className={`${inline ? 'bg-[#182229] px-1 py-0.5 rounded' : ''} text-[#e9edef]`}
                    {...props}
                >
                    {children}
                </code>
            ),
            pre: ({children}) => (
                <pre className="bg-[#182229] p-3 rounded-lg mb-2 overflow-x-auto">
                    {children}
                </pre>
            ),
            blockquote: ({children}) => (
                <blockquote className="border-l-4 border-[#8696a0] pl-4 my-2 text-[#e9edef] italic">
                    {children}
                </blockquote>
            ),
            a: ({children, href}) => (
                <a 
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                >
                    {children}
                </a>
            ),
        }}
    >
        {message.content}
    </ReactMarkdown>
);
}

// ...existing code...

return (
  <KeyboardAwareContainer scrollToBottom={scrollToBottom}>
    <div className="flex h-full bg-gradient-to-br from-[#0a0e13] to-[#1a1f2e] max-w-[100vw]">
      
      {/* Enhanced Sidebar */}
      {sidebarOpen && (
    <div className="flex flex-col w-64 bg-gradient-to-b from-[#1e2936] to-[#2a3441] p-2 text-white overflow-y-auto
                    border-r border-[#3a4553] shadow-2xl backdrop-blur-sm">
          {/* New Chat Button with better styling */}
          <div className="p-2 border-b border-[#3a4553]/50">
            <Button
              onClick={handleNewChat}
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                        text-white py-3 rounded-xl font-medium transition-all duration-200 
                        shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>New Chat</span>
            </Button>
          </div>


          {/* Chat List with enhanced styling */}
          <div className="flex-1 overflow-y-auto p-1 space-y-2">
            {chats?.map((chat) => (
              <div key={chat.chatId} className="group relative">
                <Button
                  variant="ghost"
                  className={`w-full text-left p-3 rounded-xl font-medium transition-all duration-200
                            ${selectedChat === chat.chatId 
                              ? 'bg-gradient-to-r from-blue-600/20 to-blue-700/20 text-white border border-blue-500/30 shadow-md' 
                              : 'text-[#e9edef] hover:bg-[#3a4553]/50 hover:text-white'
                            }`}
                  onClick={() => handleChatSelect(chat.chatId)}
                  disabled={isLoading}
                >
                  <div className="truncate">{chat.title}</div>
                </Button>
                
                {/* Enhanced Chat Options */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 
                               opacity-0 group-hover:opacity-100 transition-opacity duration-200
                               text-[#8696a0] hover:bg-[#3a4553] hover:text-white rounded-lg"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side="right" 
                    align="start" 
                    className="w-40 bg-[#2a3441] border-[#3a4553] shadow-xl rounded-xl"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-[#e9edef] hover:bg-red-600/20 hover:text-red-400 
                               rounded-lg transition-all duration-200"
                      onClick={() => handleDeleteChat(chat.chatId)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area with enhanced styling */}
      <div className="flex flex-col flex-grow bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#0a0e13] shadow-2xl">
        {/* Enhanced Header section */}
        <div className="border-b border-[#374151] py-3 flex items-center justify-between 
                       text-white w-full min-h-[60px] bg-gradient-to-r from-[#111827] to-[#1f2937] 
                       relative px-4 shadow-lg backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8696a0] hover:bg-[#374151]/50 hover:text-white rounded-lg 
                     transition-all duration-200 flex-shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         text-center pointer-events-none whitespace-nowrap max-w-[60%]">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-wide truncate 
                         bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Stratos AI Advisor
            </h1>
            {openRouterSettings.apiKey && (
              <div className="text-xs text-gray-400 mt-1 truncate font-medium">
                Model: {openRouterSettings.model.split('/').pop()}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
            <OpenRouterSettings onSettingsChange={setOpenRouterSettings} />
            <SignOutButton />
          </div>
        </div>

        <ScrollArea className="flex-grow mb-4 p-4 bg-gradient-to-b from-transparent to-[#0a0e13]/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-12 px-4">
              <div className="text-3xl font-bold text-white text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                How can AI transform your business today?
              </div>
              <div className="text-lg text-[#8696a0] text-center max-w-2xl">
                Share your business challenge and discover AI solutions tailored to your needs
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85vw] sm:max-w-md p-4 rounded-2xl shadow-lg backdrop-blur-sm 
                              transition-all duration-200 hover:shadow-xl ${message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/30'
                        : 'bg-gradient-to-r from-[#1f2937] to-[#374151] text-[#e9edef] border border-[#4b5563]/30'
                      }`}
                  >
                    {message.content === '...' ? 
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse">•••</div>
                      </div> 
                      : renderMessage(message)}
                  </div>
                </div>
              ))}
              <div ref={scrollDiv} />
            </div>
          )}
        </ScrollArea>
        <div className="px-4 py-4 bg-gradient-to-r from-[#111827] to-[#1f2937] border-t border-[#374151] shadow-lg">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <div className="flex-grow bg-gradient-to-r from-[#374151] to-[#4b5563] rounded-2xl 
                          shadow-lg border border-[#6b7280]/30 backdrop-blur-sm">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe your business challenge or AI needs..."
                className="border-none bg-transparent text-white placeholder-[#9ca3af] 
                         focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-12 px-4
                         font-medium"
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
            </div>
            
            <Button
              onClick={handleSend}
              size="icon"
              className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                        text-white rounded-xl shadow-lg transition-all duration-200 transform
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              disabled={isLoading}
            >
              <SendIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    
    {/* Custom Confirmation Dialog */}
    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      onConfirm={confirmDeleteChat}
      title={confirmDialog.title}
      message={confirmDialog.message}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
    />
    
    {/* Custom Input Dialog for New Chat */}
    <InputDialog
      isOpen={inputDialog.isOpen}
      onClose={() => setInputDialog({ ...inputDialog, isOpen: false })}
      onConfirm={confirmCreateChat}
      title={inputDialog.title}
      message={inputDialog.message}
      placeholder={inputDialog.placeholder}
      confirmText="Create Chat"
      cancelText="Cancel"
      variant="primary"
      maxLength={80}
    />
  </KeyboardAwareContainer>
);
}

export default ChatInterface;