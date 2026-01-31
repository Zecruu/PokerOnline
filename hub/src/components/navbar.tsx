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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Close sidebar when clicking outside
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const openSignIn = () => {
    setAuthMode("signin");
    setShowAuth(true);
    setSidebarOpen(false);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowAuth(true);
    setSidebarOpen(false);
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
      <nav className={`navbar-glass px-4 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : ''}`}>
        {/* Left side - Hamburger + Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[rgb(0,212,170)] to-[rgb(120,80,255)] rounded-xl blur opacity-0 group-hover:opacity-40 transition-opacity" />
              <img src="/logo.jpg" alt="Zecruu Games" className="relative h-10 w-10 rounded-xl" />
            </div>
            <span className="text-xl font-bold text-white hidden sm:block">
              Zecruu <span className="text-gradient">Games</span>
            </span>
          </Link>
        </div>

        {/* Center - Navigation Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-1">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/store">Store</NavLink>
          <NavLink href="/library">Library</NavLink>
        </div>

        {/* Right side - Auth Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-2 sm:px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[rgb(0,212,170)] to-[rgb(0,180,145)] rounded-full flex items-center justify-center text-[rgb(10,10,15)] font-bold text-sm shadow-lg shadow-[rgba(0,212,170,0.2)]">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium hidden sm:block">{username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:block px-4 py-2 text-white/50 hover:text-white transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openSignIn}
                className="btn-glass btn-glass-secondary px-4 sm:px-5 py-2 sm:py-2.5 text-sm"
              >
                Sign In
              </button>
              <button
                onClick={openSignUp}
                className="btn-glass btn-glass-primary px-4 sm:px-5 py-2 sm:py-2.5 text-sm hidden sm:flex"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-72 modal-glass z-50 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <img src="/logo.jpg" alt="Zecruu Games" className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-bold text-white">
              Zecruu <span className="text-gradient">Games</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="p-4">
          <div className="space-y-1">
            <SidebarLink href="/" icon="🏠" onClick={() => setSidebarOpen(false)}>Home</SidebarLink>
            <SidebarLink href="/store" icon="🛒" onClick={() => setSidebarOpen(false)}>Store</SidebarLink>
            <SidebarLink href="/library" icon="📚" onClick={() => setSidebarOpen(false)}>My Library</SidebarLink>
          </div>

          <div className="my-4 border-t border-white/10" />

          <p className="text-xs text-white/40 uppercase tracking-wider px-3 mb-2">Games</p>
          <div className="space-y-1">
            <SidebarLink href="/games/dots-survivor/dots-survivor.html" icon="🎮" onClick={() => setSidebarOpen(false)}>Velthara&apos;s Dominion</SidebarLink>
            <SidebarLink href="/games/poker/poker.html" icon="🃏" onClick={() => setSidebarOpen(false)}>Poker Online</SidebarLink>
          </div>

          <div className="my-4 border-t border-white/10" />

          {isLoggedIn ? (
            <div className="space-y-1">
              <SidebarLink href="/profile" icon="👤" onClick={() => setSidebarOpen(false)}>Profile</SidebarLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left"
              >
                <span className="text-lg">🚪</span>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={openSignIn}
                className="btn-glass btn-glass-secondary w-full justify-center py-3"
              >
                Sign In
              </button>
              <button
                onClick={openSignUp}
                className="btn-glass btn-glass-primary w-full justify-center py-3"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <p className="text-xs text-white/30 text-center">© 2025 Zecruu Games</p>
        </div>
      </div>

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

function SidebarLink({ href, icon, children, onClick }: { href: string; icon: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}

