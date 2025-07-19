import React, { useState, useEffect, useRef } from 'react';
import SignOutButton from './SignOutButton';
import OpenRouterSettings from './OpenRouterSettings';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConfirmDialog from './ui/confirm-dialog';
import InputDialog from './ui/input-dialog';
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { enhanceMarkdownFormatting, addBusinessResponseEnhancements } from '../lib/markdown-utils';
import EnhancedLoadingMessage from './EnhancedLoadingMessage';
import { apiPost, apiGet } from "@/lib/api-client";
import { Menu, MoreVertical, Trash2, SendIcon, Plus, MessageSquare, Sparkles } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { KeyboardAwareContainer } from './ui/keyboard-aware-container';
import { randomPick, sleep } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";  // FastAPI backend URL

const ChatInterface = () => {
  const { user, loading: authLoading } = useAuth();
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

  // Show elegant loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-transparent bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-border mx-auto"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
          </div>
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

  useEffect(() => {
    if (!user) return; // Don't fetch chats if no user
    
    const fetchChats = async () => {
      try {
        const data = await apiGet("/chats");
        const chatList = data.chats || [];
        setChats(chatList);
        
        // If no chats exist, create a default one
        if (chatList.length === 0) {
          console.log('No chats found, creating default chat...');
          const newChatData = await apiPost("/chats", {
            user_email: user.username, // Use username instead of email
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
  }, [user]);

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
        user_email: user.username, // Use username instead of email
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
                user_email: user.username, // Use username instead of email
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
  // Add the renderMessage function
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
              // Enhanced paragraph styling with better spacing
              p: ({children}) => (
                  <p className="text-[#e9edef] mb-4 leading-relaxed">{children}</p>
              ),
              // Enhanced text formatting
              strong: ({children}) => (
                  <strong className="font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{children}</strong>
              ),
              em: ({children}) => (
                  <em className="italic text-blue-300">{children}</em>
              ),
              // Enhanced heading hierarchy with better visual distinction
              h1: ({children}) => (
                  <h1 className="text-2xl font-bold text-white mb-6 mt-6 pb-2 border-b border-blue-500/30 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {children}
                  </h1>
              ),
              h2: ({children}) => (
                  <h2 className="text-xl font-bold text-white mb-4 mt-5 flex items-center">
                      <span className="w-2 h-6 bg-gradient-to-b from-blue-400 to-purple-400 mr-3 rounded"></span>
                      {children}
                  </h2>
              ),
              h3: ({children}) => (
                  <h3 className="text-lg font-semibold text-blue-300 mb-3 mt-4 flex items-center">
                      <span className="w-1.5 h-5 bg-blue-400 mr-2 rounded"></span>
                      {children}
                  </h3>
              ),
              h4: ({children}) => (
                  <h4 className="text-base font-semibold text-purple-300 mb-2 mt-3">{children}</h4>
              ),
              h5: ({children}) => (
                  <h5 className="text-sm font-semibold text-gray-300 mb-2 mt-2">{children}</h5>
              ),
              h6: ({children}) => (
                  <h6 className="text-sm font-medium text-gray-400 mb-1 mt-2">{children}</h6>
              ),
              // Enhanced lists with better styling and spacing
              ul: ({children}) => (
                  <ul className="space-y-2 mb-4 ml-2">{children}</ul>
              ),
              ol: ({children}) => (
                  <ol className="space-y-2 mb-4 ml-2 counter-reset-list">{children}</ol>
              ),
              li: ({children, index}) => (
                  <li className="text-[#e9edef] flex items-start group">
                      <span className="text-blue-400 mr-3 mt-1 text-sm font-bold">•</span>
                      <span className="flex-1 leading-relaxed group-hover:text-white transition-colors duration-200">
                          {children}
                      </span>
                  </li>
              ),
              // Enhanced code formatting
              code: ({node, inline, className, children, ...props}) => (
                  <code
                      className={`${
                          inline 
                              ? 'bg-slate-800/80 text-blue-300 px-2 py-1 rounded-md border border-slate-600/50 text-sm font-mono' 
                              : 'text-[#e9edef]'
                      }`}
                      {...props}
                  >
                      {children}
                  </code>
              ),
              pre: ({children}) => (
                  <pre className="bg-slate-900/90 border border-slate-600/50 p-4 rounded-xl mb-4 overflow-x-auto shadow-lg">
                      <div className="flex items-center mb-2 pb-2 border-b border-slate-700/50">
                          <div className="flex space-x-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                          <span className="ml-4 text-xs text-gray-400">Code</span>
                      </div>
                      {children}
                  </pre>
              ),
              // Enhanced blockquotes
              blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-gradient-to-b from-blue-400 to-purple-400 pl-6 py-2 my-4 bg-slate-800/30 rounded-r-lg italic">
                      <div className="text-blue-200 relative">
                          <span className="text-blue-400 text-2xl absolute -top-2 -left-2">"</span>
                          {children}
                      </div>
                  </blockquote>
              ),
              // Enhanced links
              a: ({children, href}) => (
                  <a 
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-all duration-200 font-medium"
                  >
                      {children}
                  </a>
              ),
              // Add horizontal rule styling
              hr: () => (
                  <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
              ),
              // Add table styling
              table: ({children}) => (
                  <div className="overflow-x-auto mb-4">
                      <table className="w-full border-collapse border border-slate-600/50 rounded-lg overflow-hidden">
                          {children}
                      </table>
                  </div>
              ),
              thead: ({children}) => (
                  <thead className="bg-slate-800/60">{children}</thead>
              ),
              tbody: ({children}) => (
                  <tbody>{children}</tbody>
              ),
              tr: ({children}) => (
                  <tr className="border-b border-slate-600/30 hover:bg-slate-800/30 transition-colors">
                      {children}
                  </tr>
              ),
              th: ({children}) => (
                  <th className="border border-slate-600/30 px-4 py-2 text-left font-semibold text-blue-300 bg-slate-800/40">
                      {children}
                  </th>
              ),
              td: ({children}) => (
                  <td className="border border-slate-600/30 px-4 py-2 text-[#e9edef]">
                      {children}
                  </td>
              ),
          }}
      >
          {message.type === 'bot' 
              ? addBusinessResponseEnhancements(enhanceMarkdownFormatting(message.content))
              : message.content
          }
      </ReactMarkdown>
    );
  };

  return (
    <KeyboardAwareContainer>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Enhanced Sidebar with Animations */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-500 ease-in-out overflow-hidden bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-lg border-r border-slate-700/50`}>
          <div className="p-6 border-b border-slate-700/50">
            {/* Header with Logo */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Stratos
                  </h1>
                  <p className="text-xs text-gray-400">AI Assistant</p>
                </div>
              </div>
              <Button
                onClick={handleNewChat}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>

            {/* User Info and OpenRouter Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{user?.username?.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-300">{user?.username}</span>
                </div>
                <SignOutButton />
              </div>

              {/* OpenRouter Settings - Now prominently displayed */}
              <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30">
                <OpenRouterSettings 
                  onSettingsChange={setOpenRouterSettings}
                />
              </div>
            </div>
          </div>
          
          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {chats.map((chat, index) => (
                <div
                  key={chat.chatId}
                  className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedChat === chat.chatId 
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg' 
                      : 'hover:bg-slate-700/30 border border-transparent'
                  }`}
                  onClick={() => handleChatSelect(chat.chatId)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <MessageSquare className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-gray-200 truncate">{chat.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.chatId);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area with Enhanced Design */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-800/30 to-slate-900/30">
          {/* Enhanced Header */}
          <div className="p-6 border-b border-slate-700/50 bg-slate-800/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-slate-700/30 text-gray-300 hover:text-white transition-all duration-200 rounded-xl"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedChat ? chats.find(c => c.chatId === selectedChat)?.title || 'Chat' : 'Select a conversation'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {selectedChat ? 'Active conversation' : 'Choose a chat to start messaging'}
                  </p>
                </div>
              </div>
              {selectedChat && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Online</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.length === 0 && !selectedChat && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Welcome to Stratos</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Start a new conversation or select an existing chat to continue where you left off.
                  </p>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`max-w-[80%] lg:max-w-[70%] p-4 rounded-2xl transition-all duration-300 hover:shadow-xl ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-700/40 text-gray-100 border border-slate-600/30 backdrop-blur-sm'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="prose prose-invert max-w-none">
                        {renderMessage(message)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollDiv} />
            </div>
          </ScrollArea>

          {/* Enhanced Input Area */}
          <div className="p-6 border-t border-slate-700/50 bg-slate-800/20 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-4 items-end">
                <div className="flex-1 relative">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-slate-700/30 border-slate-600/30 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-2xl px-6 py-4 text-base transition-all duration-300 backdrop-blur-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={isLoading}
                  />
                  {isLoading && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl px-6 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <SendIcon className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>

        {/* Dialogs remain the same */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          onConfirm={() => {
            confirmDeleteChat();
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          }}
          title={confirmDialog.title}
          message={confirmDialog.message}
        />

        <InputDialog
          isOpen={inputDialog.isOpen}
          onClose={() => setInputDialog({ ...inputDialog, isOpen: false })}
          onConfirm={(value) => {
            confirmCreateChat(value);
            setInputDialog({ ...inputDialog, isOpen: false });
          }}
          title={inputDialog.title}
          message={inputDialog.message}
          placeholder={inputDialog.placeholder}
        />
      </div>
    </KeyboardAwareContainer>
  );
};

export default ChatInterface;