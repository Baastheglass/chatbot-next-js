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
      } else if (e.key === 'b') {
        e.preventDefault();
        insertText('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        insertText('*', '*');
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
    // Allow Tab key to insert actual tabs for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  '); // Insert 2 spaces for indentation
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
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl w-[95vw] h-[95vh] flex flex-col border border-slate-700/50 animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-700/50 bg-slate-800/30 rounded-t-3xl flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{title}</h2>
              <p className="text-base text-slate-400">Customize how your AI assistant behaves</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200 hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-8 py-5 border-b border-slate-700/50 bg-slate-800/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => insertText('**', '**')}
              className="px-4 py-2 text-sm font-bold bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              onClick={() => insertText('*', '*')}
              className="px-4 py-2 text-sm font-medium bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 hover:scale-105 italic shadow-sm"
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              onClick={() => insertText('### ', '')}
              className="px-4 py-2 text-sm font-medium bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
              title="Heading"
            >
              H3
            </button>
            <button
              onClick={() => insertText('- ', '')}
              className="px-4 py-2 text-sm font-medium bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
              title="List Item"
            >
              •
            </button>
            <button
              onClick={() => insertText('\n---\n', '')}
              className="px-4 py-2 text-sm font-medium bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
              title="Horizontal Rule"
            >
              ⎯
            </button>
          </div>
          
          <div className="h-6 w-px bg-slate-600/50 mx-3" />
          
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <Type className="w-4 h-4" />
            <span>{prompt.length} characters</span>
            <span>•</span>
            <span>{prompt.split('\n').length} lines</span>
            {hasChanges && (
              <>
                <span className="text-amber-400 font-medium">• Unsaved changes</span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-hidden">
          <div className="h-full">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter your custom system prompt here..."
              className="w-full h-full bg-slate-800/90 text-slate-100 rounded-xl p-6 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none outline-none transition-all duration-200 font-mono text-base leading-7 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-8 border-t border-slate-700/50 bg-slate-800/30 rounded-b-3xl flex-shrink-0">
          <div className="flex items-center gap-6">
            <Button
              onClick={handleReset}
              variant="ghost"
              size="lg"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 text-base"
            >
              <RotateCcw className="w-5 h-5 mr-3" />
              Reset to Default
            </Button>
            
            <div className="text-sm text-slate-500 hidden sm:block">
              <kbd className="px-2 py-1 bg-slate-700/60 rounded-md text-sm border border-slate-600">Ctrl+S</kbd> to save
              <span className="mx-3">•</span>
              <kbd className="px-2 py-1 bg-slate-700/60 rounded-md text-sm border border-slate-600">Esc</kbd> to close
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={onClose}
              variant="ghost"
              size="lg"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-base px-8"
              disabled={!hasChanges}
            >
              <Save className="w-5 h-5 mr-3" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;
