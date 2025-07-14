import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageSquarePlus } from 'lucide-react';

const InputDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Enter Value", 
  message = "Please enter a value:",
  placeholder = "Enter text...",
  confirmText = "Create",
  cancelText = "Cancel",
  variant = "default", // "default" | "primary" | "success"
  maxLength = 100
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      // Focus input after a short delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          icon: "text-blue-400",
          confirmButton: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white",
          border: "border-blue-500/30"
        };
      case "success":
        return {
          icon: "text-green-400",
          confirmButton: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white",
          border: "border-green-500/30"
        };
      default:
        return {
          icon: "text-purple-400",
          confirmButton: "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white",
          border: "border-purple-500/30"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div 
        className={`bg-gradient-to-br from-[#1e2936] to-[#2a3441] rounded-2xl shadow-2xl border ${styles.border} max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3a4553]/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-[#374151]/50 ${styles.icon}`}>
              <MessageSquarePlus className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#8696a0] hover:bg-[#374151]/50 hover:text-white rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[#e9edef] leading-relaxed mb-4">{message}</p>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full bg-gradient-to-r from-[#374151] to-[#4b5563] border-[#6b7280]/30 text-white placeholder-[#9ca3af] 
                     focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 rounded-xl h-12 px-4"
          />
          {maxLength && (
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-[#8696a0]">
                Press Enter to confirm, Esc to cancel
              </div>
              <div className={`text-xs ${inputValue.length > maxLength * 0.9 ? 'text-yellow-400' : 'text-[#8696a0]'}`}>
                {inputValue.length}/{maxLength}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 pt-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 bg-[#374151]/30 hover:bg-[#374151]/50 text-[#e9edef] hover:text-white border border-[#4b5563]/30 rounded-xl transition-all duration-200"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            className={`flex-1 ${styles.confirmButton} rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InputDialog;
