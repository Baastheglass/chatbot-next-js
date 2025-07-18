"use client";
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const SignOutButton = () => {
  const { logout, user } = useAuth();

  const handleSignOut = async () => {
    // Clear OpenRouter settings from localStorage
    localStorage.removeItem('openrouter_api_key');
    localStorage.removeItem('openrouter_model');
    
    // Use the logout function from auth context
    await logout();
  };

  // Show username if available
  return (
    <div className="flex items-center gap-2">
      {user && (
        <span className="text-sm text-gray-400 hidden sm:block">
          {user.username}
        </span>
      )}
      <Button
        onClick={handleSignOut}
        variant="ghost" 
        size="icon"
        className="text-[#8696a0] hover:bg-[#2a3942] flex-shrink-0"
        title="Sign Out"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default SignOutButton;