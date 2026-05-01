"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
  isAdmin?: boolean;
  isTester?: boolean;
  library?: Array<{ gameId: string; purchasedAt?: string }>;
  wishlist?: string[];
  favorites?: string[];
  dotsSurvivorStats?: {
    totalGamesPlayed?: number;
    totalTimePlayed?: number;
    highestWave?: number;
    highestKills?: number;
    highestScore?: number;
  };
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

    // Refresh from server in the background so stats stay current
    if (token) {
      fetch("https://www.zecrugames.com/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh) {
            localStorage.setItem("user_data", JSON.stringify(fresh));
            setUser(fresh);
          }
        })
        .catch(() => {});
    }
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

  const ownedCount = (user.library || []).length;
  const totalHours = ((user.dotsSurvivorStats?.totalTimePlayed || 0) / 3600000);
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  // Detect which games have stats — extensible: add per-game stat blocks here.
  const velthara = user.dotsSurvivorStats;
  const hasVeltharaStats = !!velthara && (
    (velthara.totalGamesPlayed || 0) > 0 ||
    (velthara.highestWave || 0) > 0 ||
    (velthara.highestKills || 0) > 0
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Profile header */}
        <section className="card-glass p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-[rgb(0,212,170)] to-[rgb(0,180,145)] rounded-2xl flex items-center justify-center text-[rgb(10,10,15)] font-black text-4xl sm:text-5xl shadow-lg shadow-[rgba(0,212,170,0.3)] ring-2 ring-white/10">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                {user.username}
              </h1>
              <p className="text-white/50 text-sm mt-1 truncate">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {user.isAdmin && <span className="badge badge-premium">ADMIN</span>}
                {!user.isAdmin && user.isTester && <span className="badge badge-featured">TESTER</span>}
                {!user.isAdmin && !user.isTester && <span className="badge badge-featured">PLAYER</span>}
                {memberSince && (
                  <span className="badge bg-white/5 text-white/60 border border-white/10">
                    SINCE {memberSince.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Top-line stat tiles */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatTile label="Games owned" value={String(ownedCount)} />
          <StatTile label="Hours played" value={totalHours > 0 ? totalHours.toFixed(1) : "0"} />
          <StatTile label="Highest wave" value={String(velthara?.highestWave || 0)} />
          <StatTile label="Total kills" value={String(velthara?.highestKills || 0)} />
        </section>

        {/* Per-game stats sections */}
        {hasVeltharaStats && (
          <section className="card-glass p-5 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg"
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10"
                />
                <div>
                  <h2 className="text-lg font-bold text-white">Velthara&apos;s Dominion</h2>
                  <p className="text-xs text-white/40">Roguelike survivor</p>
                </div>
              </div>
              <Link
                href="https://games.zecrugames.com/veltharas-dominion/"
                className="text-[rgb(0,212,170)] hover:underline text-sm font-medium hidden sm:block"
              >
                Play →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MicroStat label="Games played" value={String(velthara?.totalGamesPlayed || 0)} />
              <MicroStat label="Highest wave" value={String(velthara?.highestWave || 0)} accent="cyan" />
              <MicroStat label="Most kills" value={String(velthara?.highestKills || 0)} accent="red" />
              <MicroStat label="High score" value={String(velthara?.highestScore || 0)} accent="gold" />
              <MicroStat
                label="Time played"
                value={totalHours > 0 ? `${totalHours.toFixed(1)}h` : "0h"}
              />
            </div>
          </section>
        )}

        {!hasVeltharaStats && (
          <section className="card-glass p-8 mb-6 sm:mb-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
              🎯
            </div>
            <h2 className="text-lg font-bold text-white mb-1">No game stats yet</h2>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Play any game in your library and your records show up here.
            </p>
            <Link href="/library" className="btn-glass btn-glass-primary inline-flex mt-5 px-6 py-2.5 text-sm">
              Open Library
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-glass p-4 text-center hover:!translate-y-0">
      <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{value}</p>
      <p className="text-white/50 text-xs mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function MicroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cyan" | "red" | "gold";
}) {
  const color =
    accent === "cyan"
      ? "text-[rgb(0,212,170)]"
      : accent === "red"
      ? "text-[rgb(255,100,100)]"
      : accent === "gold"
      ? "text-[rgb(255,200,50)]"
      : "text-white";
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-white/50 text-xs mt-0.5">{label}</p>
    </div>
  );
}
