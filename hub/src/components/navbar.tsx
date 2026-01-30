"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AuthModal } from "./auth-modal";

export function Navbar() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [scrolled, setScrolled] = useState(false);

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

    // Handle scroll effect
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      <nav className={`navbar-glass px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : ''}`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[rgb(0,212,170)] to-[rgb(120,80,255)] rounded-xl blur opacity-0 group-hover:opacity-40 transition-opacity" />
            <img src="/logo.jpg" alt="Zecruu Games" className="relative h-10 w-10 rounded-xl" />
          </div>
          <span className="text-xl font-bold text-white">
            Zecruu <span className="text-gradient">Games</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/store">Store</NavLink>
          <NavLink href="/library">Library</NavLink>
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[rgb(0,212,170)] to-[rgb(0,180,145)] rounded-full flex items-center justify-center text-[rgb(10,10,15)] font-bold text-sm shadow-lg shadow-[rgba(0,212,170,0.2)]">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium hidden sm:block">{username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-white/50 hover:text-white transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openSignIn}
                className="btn-glass btn-glass-secondary px-5 py-2.5 text-sm"
              >
                Sign In
              </button>
              <button
                onClick={openSignUp}
                className="btn-glass btn-glass-primary px-5 py-2.5 text-sm"
              >
                Sign Up
              </button>
            </>
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all font-medium text-sm"
    >
      {children}
    </Link>
  );
}

