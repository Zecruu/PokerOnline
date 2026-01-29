"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AuthModal } from "./auth-modal";

export function Navbar() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user_data");
    if (token && storedUser) {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(storedUser);
        setUsername(user.username || "Player");
      } catch {
        setUsername("Player");
      }
    }
  }, []);

  const openSignIn = () => {
    setAuthMode("signin");
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowAuth(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("remember_token");
    setIsLoggedIn(false);
    setUsername("");
    window.location.reload();
  };

  return (
    <>
      <nav className="bg-slate-900/95 backdrop-blur-sm px-6 py-4 flex justify-between items-center border-b border-slate-700/50 sticky top-0 z-50">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 text-xl font-extrabold">
          <img src="/logo.jpg" alt="Zecruu Games" className="h-10 w-10 rounded-lg" />
          <span className="text-white">Zecruu <span className="text-[rgb(0,212,170)]">Games</span></span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-white hover:text-[rgb(0,212,170)] transition-colors font-semibold">
            Home
          </Link>
          <Link href="/store" className="text-white hover:text-[rgb(0,212,170)] transition-colors font-semibold">
            Store
          </Link>
          <Link href="/library" className="text-white hover:text-[rgb(0,212,170)] transition-colors font-semibold">
            My Library
          </Link>

          {/* Auth Section */}
          {isLoggedIn ? (
            <div className="flex items-center gap-4 ml-4">
              <Link
                href="/profile"
                className="flex items-center gap-2 text-white hover:text-[rgb(0,212,170)] transition-colors font-semibold"
              >
                <span className="w-8 h-8 bg-[rgb(0,212,170)] rounded-full flex items-center justify-center text-slate-900 font-bold text-sm">
                  {username.charAt(0).toUpperCase()}
                </span>
                {username}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={openSignIn}
                className="px-4 py-2 text-white hover:text-[rgb(0,212,170)] transition-colors font-semibold"
              >
                Sign In
              </button>
              <button
                onClick={openSignUp}
                className="px-5 py-2 bg-[rgb(0,212,170)] hover:bg-[rgb(0,180,145)] text-slate-900 rounded-lg font-bold transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}
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

