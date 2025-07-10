"use client";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';

const SignOutButton = () => {
  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/login',
      redirect: true
    });
  };

  return (
    <Button
      onClick={handleSignOut}
      variant="ghost" 
      size="icon"
      className="text-[#8696a0] hover:bg-[#2a3942] absolute top-2 right-2"
      title="Sign Out"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
};

export default SignOutButton;