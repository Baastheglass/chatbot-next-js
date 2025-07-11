"use client";
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';

const SignOutButton = () => {
  const handleSignOut = async () => {
    // Authentication disabled - redirect to home page
    window.location.href = '/';
  };

  return (
    <Button
      onClick={handleSignOut}
      variant="ghost" 
      size="icon"
      className="text-[#8696a0] hover:bg-[#2a3942] flex-shrink-0"
      title="Home"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
};

export default SignOutButton;