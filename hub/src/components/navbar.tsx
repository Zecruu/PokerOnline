"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AuthModal } from "./auth-modal";

export function Navbar() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const openSignIn = () => {
    setAuthMode("signin");
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowAuth(true);
  };

  return (
    <>
      <nav className="bg-slate-800/80 backdrop-blur-sm px-6 py-4 flex justify-between items-center border-b border-slate-700/50 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 text-xl font-extrabold">
          <img src="/logo.jpg" alt="Zecruu Games" className="h-10 w-10 rounded-lg" />
          <span>Zecruu<span className="text-[rgb(0,212,170)]">Games</span></span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors font-medium">
            Home
          </Link>
          <Link href="/library" className="text-slate-400 hover:text-white transition-colors font-medium">
            Library
          </Link>
          <Link href="/store" className="text-slate-400 hover:text-white transition-colors font-medium">
            Store
          </Link>
          
          <div className="flex items-center gap-3 ml-4">
            <button 
              onClick={openSignIn}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={openSignUp}
              className="px-4 py-2 bg-[rgb(0,212,170)] hover:bg-[rgb(0,180,145)] text-slate-900 rounded-lg font-bold transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  );
}

