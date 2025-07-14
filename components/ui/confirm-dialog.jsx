import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive" // "destructive" | "warning" | "default"
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          icon: "text-red-400",
          confirmButton: "bg-red-600 hover:bg-red-700 text-white",
          border: "border-red-500/30"
        };
      case "warning":
        return {
          icon: "text-yellow-400",
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
          border: "border-yellow-500/30"
        };
      default:
        return {
          icon: "text-blue-400",
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white",
          border: "border-blue-500/30"
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
              <AlertTriangle className="h-5 w-5" />
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
          <p className="text-[#e9edef] leading-relaxed">{message}</p>
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
            className={`flex-1 ${styles.confirmButton} rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
