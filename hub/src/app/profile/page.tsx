"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

interface UserData {
  id: string;
  username: string;
  email: string;
  library?: string[];
  wishlist?: string[];
  favorites?: string[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user_data");
    const token = localStorage.getItem("auth_token");
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-[rgb(0,212,170)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="card-glass p-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
              <span className="text-4xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Not Signed In</h1>
            <p className="text-white/50 mb-6">Please sign in to view your profile.</p>
            <Link href="/" className="btn-glass btn-glass-primary px-8 py-3">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="card-glass p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-[rgb(0,212,170)] to-[rgb(0,180,145)] rounded-2xl flex items-center justify-center text-[rgb(10,10,15)] font-bold text-4xl shadow-lg shadow-[rgba(0,212,170,0.3)]">
              {user.username.charAt(0).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">{user.username}</h1>
              <p className="text-white/50">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <span className="badge badge-featured">Player</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon="🎮" label="Games Played" value="0" />
          <StatCard icon="⏱️" label="Hours Played" value="0" />
          <StatCard icon="🏆" label="Achievements" value="0" />
        </div>

        {/* Quick Actions */}
        <div className="card-glass p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/library" className="btn-glass btn-glass-secondary justify-start px-5 py-4">
              <span className="mr-3 text-xl">📚</span> My Library
            </Link>
            <Link href="/store" className="btn-glass btn-glass-secondary justify-start px-5 py-4">
              <span className="mr-3 text-xl">🛒</span> Browse Store
            </Link>
            <Link href="/games/dots-survivor/dots-survivor.html" className="btn-glass btn-glass-primary justify-start px-5 py-4">
              <span className="mr-3 text-xl">🎮</span> Play Dots Survivor
            </Link>
            <Link href="/games/poker/poker.html" className="btn-glass btn-glass-secondary justify-start px-5 py-4">
              <span className="mr-3 text-xl">🃏</span> Play Poker
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card-glass p-5 text-center">
      <span className="text-3xl mb-2 block">{icon}</span>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-white/50 text-sm">{label}</p>
    </div>
  );
}

