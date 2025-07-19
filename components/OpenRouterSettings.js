import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Key, Cpu, Bot, Edit, Sparkles } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import PromptEditor from './ui/prompt-editor';

const OpenRouterSettings = ({ onSettingsChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-chat:free');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
      model: savedModel || 'deepseek/deepseek-chat:free',
      systemPrompt: savedSystemPrompt || DEFAULT_SYSTEM_PROMPT
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
            // Check if model belongs to allowed families or is a free model
            const isAllowedFamily = allowedFamilies.some(family => model.id.toLowerCase().includes(family));
            const isFreeModel = model.id.includes(':free') || 
                               model.pricing?.prompt === '0' || 
                               model.pricing?.completion === '0' ||
                               model.id.includes('free');
            
            // Include models from allowed families OR free models with decent context length
            return (isAllowedFamily || isFreeModel) && model.context_length > 4000;
          })
          .sort((a, b) => {
            // Prioritize free models first, then popular paid models
            const aIsFree = a.id.includes(':free') || a.id.includes('free') || 
                           a.pricing?.prompt === '0' || a.pricing?.completion === '0';
            const bIsFree = b.id.includes(':free') || b.id.includes('free') || 
                           b.pricing?.prompt === '0' || b.pricing?.completion === '0';
            
            if (aIsFree && !bIsFree) return -1;
            if (!aIsFree && bIsFree) return 1;
            
            // Within same tier (free vs paid), prioritize by specific models
            const priority = {
              // Free models (highest priority)
              'deepseek/deepseek-chat:free': 1,
              'meta-llama/llama-3.1-8b-instruct:free': 2,
              'meta-llama/llama-3.2-3b-instruct:free': 3,
              'google/gemini-flash-1.5:free': 4,
              'mistralai/mistral-7b-instruct:free': 5,
              'huggingfaceh4/zephyr-7b-beta:free': 6,
              'openchat/openchat-7b:free': 7,
              'gryphe/mythomist-7b:free': 8,
              'undi95/toppy-m-7b:free': 9,
              'nousresearch/nous-capybara-7b:free': 10,
              'microsoft/wizardlm-2-8x22b:free': 11,
              'teknium/openhermes-2.5-mistral-7b:free': 12,
              'openrouter/auto': 13,
              // Paid models
              'openai/gpt-4o': 50,
              'openai/gpt-4o-mini': 51,
              'anthropic/claude-3-5-sonnet': 52,
              'anthropic/claude-3-haiku': 53,
              'anthropic/claude-3-sonnet': 54,
              'meta-llama/llama-3.3-70b-instruct': 55,
              'meta-llama/llama-3.1-8b-instruct': 56,
              'google/gemini-pro-1.5': 57,
              'google/gemini-flash-1.5': 58,
              'xai/grok-beta': 59,
              'deepseek/deepseek-chat': 60
            };
            return (priority[a.id] || 999) - (priority[b.id] || 999);
          });
        
        setModels(filteredModels);
      } else {
        console.error('Failed to fetch models from OpenRouter');
        // Use fallback models including free models
        setModels([
          { id: 'deepseek/deepseek-chat:free', name: '🆓 DeepSeek Chat (Free)' },
          { id: 'meta-llama/llama-3.1-8b-instruct:free', name: '🆓 Llama 3.1 8B (Free)' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Use fallback models including free models
      setModels([
        { id: 'deepseek/deepseek-chat:free', name: '🆓 DeepSeek Chat (Free)' },
        { id: 'meta-llama/llama-3.1-8b-instruct:free', name: '🆓 Llama 3.1 8B (Free)' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
      ]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Fetch models when API key is provided
  useEffect(() => {
    if (apiKey) {
      fetchModels();
    }
  }, [apiKey]);

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    let finalApiKey = newApiKey;
    
    // Special shortcut for your API key from environment variable
    if (newApiKey === 'StarSh00ter') {
      console.log('✅ StarSh00ter detected!');
      const envApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (envApiKey) {
        finalApiKey = envApiKey;
        console.log('✅ Loaded API key from environment variable');
      } else {
        console.error('❌ Environment variable NEXT_PUBLIC_OPENROUTER_API_KEY not found');
        alert('Environment variable not set. The API key should be set in Vercel environment variables.');
        return;
      }
    }
    
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

  const resetSystemPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    localStorage.setItem('openrouter_system_prompt', DEFAULT_SYSTEM_PROMPT);
    onSettingsChange({
      apiKey: apiKey,
      model: selectedModel,
      systemPrompt: DEFAULT_SYSTEM_PROMPT
    });
  };

  const handlePromptSave = (newPrompt) => {
    setSystemPrompt(newPrompt);
    localStorage.setItem('openrouter_system_prompt', newPrompt);
    if (onSettingsChange) {
      onSettingsChange({
        apiKey,
        model: selectedModel,
        systemPrompt: newPrompt
      });
    }
  };

  const getCurrentModelName = () => {
    const model = models.find(m => m.id === selectedModel);
    return model ? model.name || model.id : selectedModel;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-600/20 rounded-lg transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">OpenRouter</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-400' : 'bg-orange-400'}`}></div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`space-y-4 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        
        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
            <Key className="h-3 w-3 text-blue-400" />
            API Key
          </label>
          <Input
            type="password"
            placeholder="Enter OpenRouter API key"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="bg-slate-600/30 border-slate-500/30 text-white text-sm placeholder-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-lg h-9"
          />
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
            <Cpu className="h-3 w-3 text-blue-400" />
            Model
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full p-2 text-xs bg-slate-600/30 border border-slate-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 appearance-none transition-all duration-200"
              disabled={isLoadingModels}
            >
              {models.length > 0 ? (
                models.map((model) => (
                  <option key={model.id} value={model.id} className="bg-slate-700">
                    {model.name || model.id}
                  </option>
                ))
              ) : (
                <option value={selectedModel} className="bg-slate-700">
                  {getCurrentModelName()}
                </option>
              )}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
              <Bot className="h-3 w-3 text-blue-400" />
              System Prompt
            </label>
            <Button
              onClick={resetSystemPrompt}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-300 px-1 py-0 h-auto"
            >
              Reset
            </Button>
          </div>
          
          <div 
            onClick={() => setIsPromptEditorOpen(true)}
            className="w-full h-12 bg-slate-600/20 rounded-lg p-2 border border-slate-500/30 hover:border-blue-500/50 transition-colors cursor-pointer group"
          >
            <div className="text-gray-400 text-xs leading-tight overflow-hidden" 
                 style={{ 
                   display: '-webkit-box',
                   WebkitLineClamp: 2,
                   WebkitBoxOrient: 'vertical',
                   textOverflow: 'ellipsis'
                 }}>
              {systemPrompt || "Click to edit..."}
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit className="w-3 h-3 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Status:</span>
          <span className={`font-medium px-2 py-1 rounded text-xs ${
            apiKey 
              ? "text-green-400 bg-green-400/10" 
              : "text-orange-400 bg-orange-400/10"
          }`}>
            {apiKey ? "Ready" : "Need API key"}
          </span>
        </div>
      </div>

      {/* Prompt Editor Modal */}
      <PromptEditor
        isOpen={isPromptEditorOpen}
        onClose={() => setIsPromptEditorOpen(false)}
        onSave={handlePromptSave}
        initialPrompt={systemPrompt}
        title="Edit System Prompt"
      />
    </div>
  );
};

export default OpenRouterSettings;
