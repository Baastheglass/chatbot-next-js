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
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import api, { apiPost,apiGet } from "@/lib/requests";
import { Menu, MoreVertical, Trash2, Plus, GitBranchIcon, VideoIcon, ListChecksIcon, SendIcon } from 'lucide-react'; // e.g. for toggle icon
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
  const [answeredMCQs, setAnsweredMCQs] = useState(new Set());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // OpenRouter settings state
  const [openRouterSettings, setOpenRouterSettings] = useState({
    apiKey: '',
    model: 'anthropic/claude-3-haiku'
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
    try {
      const chatTitle = window.prompt("Enter a name for the new chat:");
      if (!chatTitle) return;
  
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
    // Add confirmation
    const confirmed = window.confirm("Are you sure you want to delete this chat?");
    if (!confirmed) return;
  
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
        // Track answered MCQs based on attachmentData
        const answeredMcqIds = new Set();
        data.messages.forEach(msg => {
          if (msg.attachmentType === 'mcq' && 
              msg.attachmentData?.isAnswered) {
            answeredMcqIds.add(msg.attachmentData.question); // Using question as unique identifier
          }
        });
  
        // Update answered MCQs state
        setAnsweredMCQs(answeredMcqIds);
  
        // Map messages for display
        setMessages(data.messages.map(m => ({
          type: m.role,
          content: m.content,
          attachmentType: m.attachmentType,
          attachmentData: m.attachmentData
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
            model: openRouterSettings.model
        });

        // Get response from chat endpoint with proper headers
        const data = await apiPost("/chat", { 
            message: inputText, 
            session_id: sessionId 
        }, {
            headers: {
                'X-OpenRouter-API-Key': openRouterSettings.apiKey,
                'X-OpenRouter-Model': openRouterSettings.model
            }
        });
        
        // Handle different response types and save to DB
        if (data.type) {
            switch (data.type) {
                case 'mcq':
                    // Save MCQ to DB
                    await apiPost(`/chats/${selectedChat}/messages`, {
                        role: 'assistant',
                        content: data.response,
                        attachmentType: 'mcq',
                        attachmentData: {
                            ...data.data,
                            id: Date.now()
                        }
                    });

                    // Update UI
                    setMessages(prev => [...prev.slice(0, -1), {
                        type: 'bot',
                        content: data.response,
                        attachmentType: 'mcq',
                        attachmentData: {
                            ...data.data,
                            id: Date.now()
                        }
                    }]);
                    break;
                    
                case 'video':
                    // Save video response to DB
                    await apiPost(`/chats/${currentChatId}/messages`, {
                        role: 'assistant',
                        content: data.response,
                        attachmentType: 'video',
                        attachmentData: data.data
                    });

                    // Update UI
                    setMessages(prev => [...prev.slice(0, -1), {
                        type: 'bot',
                        content: data.response,
                        attachmentType: 'video',
                        attachmentData: data.data
                    }]);
                    break;
                    
                case 'diagram':
                    // Save diagram to DB
                    await apiPost(`/chats/${currentChatId}/messages`, {
                        role: 'assistant',
                        content: data.response,
                        attachmentType: 'diagram',
                        attachmentData: data.data
                    });

                    // Update UI
                    setMessages(prev => [...prev.slice(0, -1), {
                        type: 'bot',
                        content: data.response,
                        attachmentType: 'diagram',
                        attachmentData: data.data
                    }]);
                    break;
                    
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
  const handleAttachmentOption = async (type) => {
    setPopoverOpen(false);  // Close popover when any option is selected

    // Create chat if none selected
    let currentChatId = selectedChat;
    if (!currentChatId) {
        console.log('No chat selected for attachment, creating new chat...');
        const chatData = await apiPost("/chats", {
            user_email: userEmail,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Request`
        });
        currentChatId = chatData.chatId;
        setSelectedChat(currentChatId);
        
        // Refresh chat list
        const updatedChats = await apiGet("/chats");
        setChats(updatedChats.chats || []);
    }

    if (type === 'mcq') {
      try {
        setIsLoading(true);
        setMessages(prev => [
          ...prev,
          {
            type: 'bot',
            content: 'Generating MCQ...',
            attachmentType: 'loading'
          }
        ]);
  
        const mcqData= await apiPost("/mcq", { session_id: sessionId });
        // Save the MCQ in db with attachment info
        await apiPost(`/chats/${currentChatId}/messages`, {
          role: 'assistant',
          content: mcqData.response,
          attachmentType: 'mcq',
          attachmentData: {
            ...mcqData.data
          }
        });

  
        // Remove loading message
        setMessages(prev => [
          ...prev.slice(0, -1),
          // Show the returned MCQ in the UI
          {
            type: 'bot',
            content: mcqData.response, // or whatever text your /mcq endpoint returns
            attachmentType: 'mcq',
            attachmentData: {
              ...mcqData.data,
              id: Date.now()
            }
          }
        ]);
  
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            type: 'bot',
            content: 'Seems like there is no relevant MCQ related to this particular topic :('
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }else if (type === 'diagram') {
        try {
            setIsLoading(true);
          const lastUserMessage = messages
            .filter(msg => msg.type === 'user') // only user messages
            .slice(-1)[0];                      // get the last one

          // If there's no user message, handle gracefully:
          const userQuery = lastUserMessage ? lastUserMessage.content : '';

            // Add loading message
            setMessages(prev => [...prev, {
                type: 'bot',
                content: 'Fetching relevant diagram...',
                attachmentType: 'loading'
            }]);

           const data = await apiPost("/diagram", { session_id: sessionId, user_query: userQuery });
           await apiPost(`/chats/${currentChatId}/messages`, {
            role: 'assistant',
            content: data.response,
            attachmentType: 'diagram',
            attachmentData: {
              ...data.data
            }
        });

            // Remove loading message and add diagram
            setMessages(prev => [...prev.slice(0, -1), {
                type: 'bot',
                content: data.response,
                attachmentType: 'diagram',
                attachmentData: {
                    image_path: data.data.image_path,
                    description: data.data.description,
                    type: data.data.type,
                    relevance_score: data.data.relevance_score
                }
            }]);

        } catch (error) {
            console.error('Error:', error);
            // Remove loading message and add error
            setMessages(prev => [...prev.slice(0, -1), {
                type: 'bot',
                content: 'Seems like there is no relevant diagram related to this particular topic :('
            }]);
        } finally {
            setIsLoading(false);
        }
    } else if (type === 'video') {
        try {
            setIsLoading(true);
            
            // Add loading message
            setMessages(prev => [...prev, {
                type: 'bot',
                content: 'Finding relevant videos...',
                attachmentType: 'loading'
            }]);

            const data = await apiPost("/video", { session_id: sessionId });
            await apiPost(`/chats/${currentChatId}/messages`, {
              role: 'assistant',
              content: data.response,
              attachmentType: 'video',
              attachmentData: {
                ...data.data
              }
          });
            

            // Remove loading message and add video
            setMessages(prev => [...prev.slice(0, -1), {
                type: 'bot',
                content: data.response,
                attachmentType: 'video',
                attachmentData: data.data
            }]);

        } catch (error) {
            console.error('Error:', error);
            // Remove loading message and add error
            setMessages(prev => [...prev.slice(0, -1), {
                type: 'bot',
                content: 'Sorry, I could not find any relevant videos related to this topic :('
            }]);
        } finally {
            setIsLoading(false);
        }
    }
};
  // Add the handleCheckTopic function
  const handleCheckTopic = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/extract_topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add bot message showing the detected topic
      setMessages(prev => [...prev, {
        type: 'bot',
        content: data.topic ? 
          `Current topic: ${data.topic} (Confidence: ${(data.confidence * 100).toFixed(1)}%)` :
          'No specific medical topic detected in the current conversation.',
        attachmentType: 'topic',
        attachmentData: {
          topic: data.topic,
          confidence: data.confidence
        }
      }]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Failed to detect topic. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleMCQAnswer = async (mcqData, selectedOption) => {
    const answer = selectedOption.charAt(0);
    const isCorrect = answer === mcqData.correct_answer;
    
    try {
      // Update the MCQ record with answer data
      await apiPost(`/chats/${selectedChat}/messages`, {
        role: 'assistant',
        content: mcqData.question,
        attachmentType: 'mcq',
        attachmentData: {
          ...mcqData,
          isAnswered: true,
          userAnswer: selectedOption,
          isCorrect: isCorrect
        }
      });
  
      // Add user's answer as a message
      await apiPost(`/chats/${selectedChat}/messages`, {
        role: 'user',
        content: `Selected: ${selectedOption}`
      });
  
      // Add evaluation message
      await apiPost(`/chats/${selectedChat}/messages`, {
        role: 'assistant',
        content: `${isCorrect ? '✓ Correct!' : '✗ Incorrect.'} ${mcqData.explanation}`
      });
  
      // Update UI with both messages
      setMessages(prev => [
        ...prev,
        {
          type: 'user',
          content: `Selected: ${selectedOption}`
        },
        {
          type: 'bot',
          content: `${isCorrect ? '✓ Correct!' : '✗ Incorrect.'} ${mcqData.explanation}`
        }
      ]);
  
      // Update answered MCQs state
      setAnsweredMCQs(prev => new Set([...prev, mcqData.question]));
  
    } catch (error) {
      console.error('Error saving MCQ answer:', error);
    }
  };
  const renderMessage = (message) => {
    if (message.attachmentType === 'mcq') {
      const isAnswered = message.attachmentData.isAnswered || answeredMCQs.has(message.attachmentData.question);
      //const isAnswered = answeredMCQs.has(mcqId);
  
      return (
        <div className="space-y-2 overflow-x-auto break-words">              
        <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  components={{
                      p: ({children}) => (
                          <p className="font-bold text-[#e9edef] mb-2">{children}</p>
                      )
                  }}
              >
                  {message.attachmentData.question}
              </ReactMarkdown>
  
              <div className="space-y-1">
            {message.attachmentData.options.map((option, idx) => (
              <Button
                key={idx}
                variant="ghost"
                className={`w-full text-[#e9edef] bg-slate-700 hover:bg-[#182229] ${isAnswered ? 'opacity-50 cursor-not-allowed' : ''
                  } whitespace-normal h-auto py-2 px-3`}
                onClick={() => handleMCQAnswer(message.attachmentData, option)}
                disabled={isAnswered}
              >
                <div className="flex w-full text-left">
                  <span className="flex-shrink-0 w-6">{option.charAt(0)})</span>
                  <span className="flex-1">{option.slice(2)}</span>
                </div>
              </Button>
            ))}
              </div>
              {isAnswered && (
                  <p className="text-sm text-[#8696a0] italic">
                      You've already answered this MCQ.
                  </p>
              )}
          </div>
      );
  } else if (message.attachmentType === 'loading') {
      return (
          <div className="flex items-center space-x-2 text-[#8696a0]">
              <div className="animate-pulse">•••</div>
              <span className="text-sm">{message.content}</span>
          </div>
      );
  }else if (message.attachmentType === 'topic') {
      return (
        <div className="space-y-2">
          <div className="font-medium">Topic Detection:</div>
          <div>
            {message.attachmentData.topic ? (
              <>
                <div>Topic: <span className="font-semibold">{message.attachmentData.topic}</span></div>
                <div>Confidence: <span className="font-semibold">{(message.attachmentData.confidence * 100).toFixed(1)}%</span></div>
              </>
            ) : (
              <div>No specific medical topic detected.</div>
            )}
          </div>
        </div>
      );
    }else if (message.attachmentType === 'diagram') {
      return (
        <div className="space-y-2">
          <img 
            src={message.attachmentData.image_path} 
            alt={message.attachmentData.description}
            className="w-full rounded-lg"
          />
          <p className="text-sm mt-2 text-[#e9edef]">
            {message.attachmentData.description}
          </p>
          <div className="text-xs text-[#8696a0] flex justify-between">
            <span>Type: {message.attachmentData.type}</span>
            <span>Relevance: {(message.attachmentData.relevance_score * 100).toFixed(1)}%</span>
          </div>
        </div>
      );
    }else if (message.attachmentType === 'video') {
      return (
          <div className="space-y-4">
              <p className="font-medium">{message.content}</p>
              {message.attachmentData.urdu.length > 0 && (
                  <div className="space-y-2">
                      <p className="font-medium text-[#8696a0]">Urdu Videos:</p>
                      {message.attachmentData.urdu.map((video, idx) => (
                          <div key={idx} className="space-y-1">
                              <a 
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline block"
                              >
                                  {video.url}
                              </a>
                              <p className="text-sm text-[#8696a0]">
                                  Relevance: {(video.relevance_score * 100).toFixed(1)}%
                              </p>
                          </div>
                      ))}
                  </div>
              )}
              {message.attachmentData.english.length > 0 && (
                  <div className="space-y-2">
                      <p className="font-medium text-[#8696a0]">English Videos:</p>
                      {message.attachmentData.english.map((video, idx) => (
                          <div key={idx} className="space-y-1">
                              <a 
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline block"
                              >
                                  {video.url}
                              </a>
                              <p className="text-sm text-[#8696a0]">
                                  Relevance: {(video.relevance_score * 100).toFixed(1)}%
                              </p>
                          </div>
                      ))}
                  </div>
              )}
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
              <Plus className="h-4 w-4" />
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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#8696a0] hover:bg-[#374151]/50 hover:text-white rounded-xl
                           transition-all duration-200 shadow-md"
                  disabled={isLoading || loadingType !== null}
                >
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-64 bg-[#2a3441] border-[#3a4553] shadow-xl rounded-xl">
                <div className="space-y-2">
                  {[
                    { type: 'diagram', icon: GitBranchIcon, label: 'Create Diagram' },
                    { type: 'video', icon: VideoIcon, label: 'Recommend Video' },
                    { type: 'mcq', icon: ListChecksIcon, label: 'Show MCQ' }
                  ].map(({ type, icon: Icon, label }) => (
                    <Button
                      key={type}
                      variant="ghost"
                      className="w-full justify-start text-[#e9edef] hover:bg-[#3a4553]/50 hover:text-white
                               rounded-lg transition-all duration-200"
                      onClick={() => handleAttachmentOption(type)}
                      disabled={isLoading}
                    >
                      <Icon className="mr-3 h-4 w-4 sm:h-5 sm:w-5 text-[#8696a0]" />
                      {label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
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
  </KeyboardAwareContainer>
);
}

export default ChatInterface;