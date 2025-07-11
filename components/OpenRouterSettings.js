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
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openrouter_api_key');
    const savedModel = localStorage.getItem('openrouter_model');
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (savedModel) {
      setSelectedModel(savedModel);
    }
    
    // Notify parent component of initial settings
    onSettingsChange({
      apiKey: savedApiKey || '',
      model: savedModel || 'anthropic/claude-3-haiku'
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
        // Filter and sort models for better UX
        const sortedModels = data.data
          .filter(model => !model.id.includes('free') && model.context_length > 4000)
          .sort((a, b) => {
            // Prioritize popular models
            const priority = {
              'anthropic/claude-3-haiku': 1,
              'anthropic/claude-3-sonnet': 2,
              'openai/gpt-4o-mini': 3,
              'openai/gpt-4o': 4,
              'meta-llama/llama-3.1-8b-instruct': 5,
              'google/gemini-pro': 6
            };
            return (priority[a.id] || 999) - (priority[b.id] || 999);
          });
        
        setModels(sortedModels);
      } else {
        console.error('Failed to fetch models from OpenRouter');
        // Use fallback models if API fails
        setModels([
          { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
          { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'openai/gpt-4o', name: 'GPT-4o' },
          { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
          { id: 'google/gemini-pro', name: 'Gemini Pro' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Use fallback models
      setModels([
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'openai/gpt-4o', name: 'GPT-4o' },
        { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
        { id: 'google/gemini-pro', name: 'Gemini Pro' }
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
    setApiKey(newApiKey);
    localStorage.setItem('openrouter_api_key', newApiKey);
    onSettingsChange({
      apiKey: newApiKey,
      model: selectedModel
    });
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem('openrouter_model', newModel);
    onSettingsChange({
      apiKey: apiKey,
      model: newModel
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
          className="flex items-center gap-2 h-8 px-3"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">OpenRouter</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="h-4 w-4" />
            OpenRouter Settings
          </div>
          
          {/* API Key Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Key className="h-3 w-3" />
              API Key
            </label>
            <Input
              type="password"
              placeholder="Paste your OpenRouter API key"
              value={apiKey}
              onChange={handleApiKeyChange}
              className="text-xs"
            />
            <p className="text-xs text-gray-500">
              Get your API key from{' '}
              <a 
                href="https://openrouter.ai/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              AI Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={handleModelChange}
                className="w-full p-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                disabled={isLoadingModels}
              >
                {models.length > 0 ? (
                  models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id}
                    </option>
                  ))
                ) : (
                  <option value={selectedModel}>
                    {getCurrentModelName()}
                  </option>
                )}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
            {isLoadingModels && (
              <p className="text-xs text-gray-500">Loading available models...</p>
            )}
          </div>

          {/* Current Settings Summary */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={apiKey ? "text-green-600 font-medium" : "text-orange-600"}>
                  {apiKey ? "Ready" : "API key needed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Model:</span>
                <span className="font-medium">{getCurrentModelName()}</span>
              </div>
            </div>
          </div>

          {/* Refresh Models Button */}
          {apiKey && (
            <Button
              onClick={fetchModels}
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={isLoadingModels}
            >
              {isLoadingModels ? 'Refreshing...' : 'Refresh Models'}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default OpenRouterSettings;
