import React, { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, ChevronDown, Key, Cpu } from 'lucide-react';

const OpenRouterSettings = ({ onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3-haiku');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant focused on business and strategic advice. Provide clear, actionable insights while being professional and concise.');
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openrouter_api_key');
    const savedModel = localStorage.getItem('openrouter_model');
    const savedSystemPrompt = localStorage.getItem('openrouter_system_prompt');
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (savedModel) {
      setSelectedModel(savedModel);
    }
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
    
    // Notify parent component of initial settings
    onSettingsChange({
      apiKey: savedApiKey || '',
      model: savedModel || 'anthropic/claude-3-haiku',
      systemPrompt: savedSystemPrompt || 'You are a helpful AI assistant focused on business and strategic advice. Provide clear, actionable insights while being professional and concise.'
    });
  }, [onSettingsChange]);

  // Fetch available models from OpenRouter via backend proxy
  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8007'}/openrouter/models`, {
        headers: {
          'X-OpenRouter-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter for specific model families: OpenAI, Claude, Llama, Gemini, XAI, Deepseek
        const allowedFamilies = ['openai/', 'anthropic/', 'meta-llama/', 'google/', 'xai/', 'deepseek/'];
        
        const filteredModels = data.data
          .filter(model => {
            // Check if model belongs to allowed families
            const isAllowedFamily = allowedFamilies.some(family => model.id.toLowerCase().includes(family));
            // Also filter out free models and ensure decent context length
            return isAllowedFamily && !model.id.includes('free') && model.context_length > 4000;
          })
          .sort((a, b) => {
            // Prioritize popular models from allowed families
            const priority = {
              'openai/gpt-4o': 1,
              'openai/gpt-4o-mini': 2,
              'anthropic/claude-3-5-sonnet': 3,
              'anthropic/claude-3-haiku': 4,
              'anthropic/claude-3-sonnet': 5,
              'meta-llama/llama-3.3-70b-instruct': 6,
              'meta-llama/llama-3.1-8b-instruct': 7,
              'google/gemini-pro-1.5': 8,
              'google/gemini-flash-1.5': 9,
              'xai/grok-beta': 10,
              'deepseek/deepseek-chat': 11
            };
            return (priority[a.id] || 999) - (priority[b.id] || 999);
          });
        
        setModels(filteredModels);
      } else {
        console.error('Failed to fetch models from OpenRouter');
        // Use fallback models from specified families only
        setModels([
          { id: 'openai/gpt-4o', name: 'GPT-4o' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
          { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
          { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
          { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
          { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
          { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
          { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
          { id: 'xai/grok-beta', name: 'Grok Beta' },
          { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Use fallback models from specified families only
      setModels([
        { id: 'openai/gpt-4o', name: 'GPT-4o' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
        { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
        { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
        { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
        { id: 'xai/grok-beta', name: 'Grok Beta' },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
      ]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Fetch models when API key is provided or component opens
  useEffect(() => {
    if (apiKey && isOpen) {
      fetchModels();
    }
  }, [apiKey, isOpen]);

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    let finalApiKey = newApiKey;
    
    // Special shortcut for your API key from environment variable
    if (newApiKey === 'StarSh00ter') {
      console.log('✅ StarSh00ter detected!');
      console.log('Environment variable value:', process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
      
      const envApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (envApiKey) {
        finalApiKey = envApiKey;
        console.log('✅ Loaded API key from environment variable');
      } else {
        console.error('❌ Environment variable NEXT_PUBLIC_OPENROUTER_API_KEY not found');
        console.log('Available environment variables:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
        alert('Environment variable not set. The API key should be set in Vercel environment variables.');
        return; // Don't proceed if env var is missing
      }
    }
    
    console.log('Final API key length:', finalApiKey.length);
    
    setApiKey(finalApiKey);
    localStorage.setItem('openrouter_api_key', finalApiKey);
    onSettingsChange({
      apiKey: finalApiKey,
      model: selectedModel,
      systemPrompt: systemPrompt
    });
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem('openrouter_model', newModel);
    onSettingsChange({
      apiKey: apiKey,
      model: newModel,
      systemPrompt: systemPrompt
    });
  };

  const handleSystemPromptChange = (e) => {
    const newSystemPrompt = e.target.value;
    setSystemPrompt(newSystemPrompt);
    localStorage.setItem('openrouter_system_prompt', newSystemPrompt);
    onSettingsChange({
      apiKey: apiKey,
      model: selectedModel,
      systemPrompt: newSystemPrompt
    });
  };

  const resetSystemPrompt = () => {
    const defaultPrompt = 'You are a helpful AI assistant focused on business and strategic advice. Provide clear, actionable insights while being professional and concise.';
    setSystemPrompt(defaultPrompt);
    localStorage.setItem('openrouter_system_prompt', defaultPrompt);
    onSettingsChange({
      apiKey: apiKey,
      model: selectedModel,
      systemPrompt: defaultPrompt
    });
  };

  const getCurrentModelName = () => {
    const model = models.find(m => m.id === selectedModel);
    return model ? model.name || model.id : selectedModel;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 h-10 px-3 min-w-0 bg-gradient-to-r from-[#374151] to-[#4b5563] 
                   border-[#6b7280]/30 text-white hover:from-[#4b5563] hover:to-[#6b7280] 
                   transition-all duration-200 shadow-md hover:shadow-lg rounded-xl"
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline text-sm font-medium">OpenRouter</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-6 bg-gradient-to-br from-[#1f2937] to-[#374151] border-[#4b5563] 
                 shadow-2xl rounded-2xl backdrop-blur-sm" 
        align="end"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Cpu className="h-5 w-5 text-blue-400" />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              OpenRouter Settings
            </span>
          </div>
          
          {/* API Key Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-400" />
              API Key
            </label>
            <Input
              type="password"
              placeholder="Paste your OpenRouter API key"
              value={apiKey}
              onChange={handleApiKeyChange}
              className="bg-[#4b5563] border-[#6b7280] text-white placeholder-gray-400 
                       focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
            />
            <p className="text-xs text-gray-400">
              Get your API key from{' '}
              <a 
                href="https://openrouter.ai/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              AI Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={handleModelChange}
                className="w-full p-3 text-sm bg-[#4b5563] border border-[#6b7280] rounded-xl 
                         text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                         focus:border-blue-500 appearance-none transition-all duration-200"
                disabled={isLoadingModels}
              >
                {models.length > 0 ? (
                  models.map((model) => (
                    <option key={model.id} value={model.id} className="bg-[#4b5563]">
                      {model.name || model.id}
                    </option>
                  ))
                ) : (
                  <option value={selectedModel} className="bg-[#4b5563]">
                    {getCurrentModelName()}
                  </option>
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {isLoadingModels && (
              <p className="text-sm text-blue-400 animate-pulse">Loading available models...</p>
            )}
          </div>

          {/* System Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-400" />
                System Prompt
              </label>
              <Button
                onClick={resetSystemPrompt}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-white px-2 py-1 h-auto"
              >
                Reset
              </Button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={handleSystemPromptChange}
              placeholder="Enter system instructions for the AI..."
              className="w-full p-3 text-sm bg-[#4b5563] border border-[#6b7280] rounded-xl 
                       text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 
                       resize-none transition-all duration-200 min-h-[80px]"
              rows={3}
            />
            <p className="text-xs text-gray-400">
              Define how the AI should behave and respond to your queries
            </p>
          </div>

          {/* Current Settings Summary */}
          <div className="pt-4 border-t border-[#4b5563]">
            <div className="text-sm text-gray-300 space-y-2">
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <span className={`font-medium px-2 py-1 rounded-lg text-xs ${
                  apiKey 
                    ? "text-green-400 bg-green-400/10" 
                    : "text-orange-400 bg-orange-400/10"
                }`}>
                  {apiKey ? "Ready" : "API key needed"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Model:</span>
                <span className="font-medium text-blue-400">{getCurrentModelName()}</span>
              </div>
            </div>
          </div>

          {/* Refresh Models Button */}
          {apiKey && (
            <Button
              onClick={fetchModels}
              variant="outline"
              size="sm"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                       text-white border-none shadow-lg transition-all duration-200 transform hover:scale-[1.02] rounded-xl"
              disabled={isLoadingModels}
            >
              {isLoadingModels ? 'Refreshing...' : 'Refresh Models'}
            </Button>
          )}
          
          {/* Temporary Debug Button */}
          <Button
            onClick={() => {
              console.log('=== DEBUG INFO ===');
              console.log('All NEXT_PUBLIC_ env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
              console.log('NEXT_PUBLIC_OPENROUTER_API_KEY:', process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
              console.log('Type:', typeof process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
              console.log('Length:', process.env.NEXT_PUBLIC_OPENROUTER_API_KEY?.length);
              console.log('==================');
            }}
            variant="outline"
            size="sm"
            className="w-full text-xs text-gray-400 border-gray-600 hover:bg-gray-700"
          >
            🐛 Debug Environment
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default OpenRouterSettings;
