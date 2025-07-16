import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Save, RotateCcw, Type, FileText, Sparkles } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

const PromptEditor = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialPrompt = DEFAULT_SYSTEM_PROMPT,
  title = "Edit System Prompt"
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setPrompt(initialPrompt);
    setHasChanges(false);
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handlePromptChange = (e) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    setHasChanges(newPrompt !== initialPrompt);
  };

  const handleSave = () => {
    onSave(prompt);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setPrompt(DEFAULT_SYSTEM_PROMPT);
    setHasChanges(DEFAULT_SYSTEM_PROMPT !== initialPrompt);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const insertText = (before, after = '') => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = prompt.substring(start, end);
    const newText = prompt.substring(0, start) + before + selectedText + after + prompt.substring(end);
    
    setPrompt(newText);
    setHasChanges(true);
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="text-sm text-slate-400">Customize how your AI assistant behaves</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => insertText('**', '**')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => insertText('*', '*')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors italic"
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              onClick={() => insertText('### ', '')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
              title="Heading"
            >
              H3
            </button>
            <button
              onClick={() => insertText('- ', '')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
              title="List Item"
            >
              •
            </button>
          </div>
          
          <div className="h-4 w-px bg-slate-600 mx-2" />
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Type className="w-3 h-3" />
            <span>{prompt.length} characters</span>
            {hasChanges && (
              <>
                <span className="text-amber-400">• Unsaved changes</span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter your custom system prompt here..."
              className="w-full h-full bg-slate-800 text-slate-100 rounded-lg p-4 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none outline-none transition-colors font-mono text-sm leading-relaxed"
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
            
            <div className="text-xs text-slate-500">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">Ctrl+S</kbd> to save
              <span className="mx-2">•</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">Esc</kbd> to close
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              disabled={!hasChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;
