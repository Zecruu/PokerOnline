"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { GAMES, getOwnedGames, type Game } from "@/lib/games";

interface GameStats {
  totalGamesPlayed?: number;
  totalTimePlayed?: number; // milliseconds
  highestWave?: number;
  highestKills?: number;
  highestScore?: number;
}

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
  // /api/auth/me returns the Velthara stats under `stats`. Older
  // localStorage payloads stored it as `dotsSurvivorStats`, so we read
  // both and prefer the fresh API field.
  stats?: GameStats;
  dotsSurvivorStats?: GameStats;
}

// Per-game stats entry for the Time Played list.
interface GameTimeEntry {
  gameId: string;
  title: string;
  thumbnail: string;
  hrefOrPath: string;
  hours: number;
  topScore?: { label: string; value: string };
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

  // Same logic as the library page so the counts match.
  const ownedIds = (user.library || []).map((g) => g.gameId);
  const playableGames = getOwnedGames({
    ownedIds,
    isAdmin: user.isAdmin,
    isTester: user.isTester,
  });
  const playableCount = playableGames.length;
  const purchasedCount = ownedIds.length;

  // Read from `stats` first (current API), fall back to `dotsSurvivorStats`
  // (legacy localStorage payloads).
  const velthara: GameStats = user.stats || user.dotsSurvivorStats || {};
  const veltharaHours = (velthara.totalTimePlayed || 0) / 3600000;
  const totalHours = veltharaHours; // sum here as more games gain tracking

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  // Build the Time Played list. Today only Velthara reports hours; new
  // entries can be appended as we add per-game stat fields server-side.
  const veltharaGame = GAMES.find((g) => g.id === "veltharas-dominion");
  const timeEntries: GameTimeEntry[] = [];
  if (veltharaGame && veltharaHours > 0) {
    timeEntries.push({
      gameId: veltharaGame.id,
      title: veltharaGame.title,
      thumbnail: veltharaGame.thumbnail,
      hrefOrPath: veltharaGame.href,
      hours: veltharaHours,
      topScore: velthara.highestWave
        ? { label: "Highest wave", value: String(velthara.highestWave) }
        : undefined,
    });
  }
  timeEntries.sort((a, b) => b.hours - a.hours);
  const topGameHours = timeEntries[0]?.hours || 0;
  const topGameTitle = timeEntries[0]?.title;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Profile header — full-width row */}
        <section className="card-glass p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-[rgb(0,212,170)] to-[rgb(0,180,145)] rounded-2xl flex items-center justify-center text-[rgb(10,10,15)] font-black text-4xl sm:text-5xl shadow-lg shadow-[rgba(0,212,170,0.3)] ring-2 ring-white/10 flex-shrink-0">
              {user.username.charAt(0).toUpperCase()}
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

            {/* Right-aligned summary stats on lg+ — fills the header width */}
            <div className="hidden lg:flex items-stretch gap-3 ml-auto">
              <HeaderStat label="Games" value={String(playableCount)} />
              <HeaderStat label="Purchased" value={String(purchasedCount)} />
              <HeaderStat
                label="Hours"
                value={totalHours > 0 ? totalHours.toFixed(1) : "0"}
              />
            </div>
          </div>
        </section>

        {/* lg+ layout: 2-col with stats + activity on left, library preview on right */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left col: stats + per-game */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stat tiles — visible at all breakpoints (header tiles only show on lg+) */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:hidden">
              <StatTile label="Games" value={String(playableCount)} />
              <StatTile label="Purchased" value={String(purchasedCount)} />
              <StatTile label="Hours" value={totalHours > 0 ? totalHours.toFixed(1) : "0"} />
              <StatTile label="High wave" value={String(velthara?.highestWave || 0)} />
            </section>

            {/* Time Played — top game hours headline + per-game breakdown */}
            <section className="card-glass p-5 sm:p-6">
              <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1.5">
                    Time Played
                  </p>
                  <p className="text-4xl sm:text-5xl font-black text-white tabular-nums leading-none">
                    {totalHours.toFixed(1)}<span className="text-2xl text-white/50 font-bold ml-1">h</span>
                  </p>
                  {topGameTitle && topGameHours > 0 && (
                    <p className="text-white/50 text-sm mt-2">
                      Most in <span className="text-white font-semibold">{topGameTitle}</span>
                      <span className="text-[rgb(0,212,170)] font-semibold ml-1.5">
                        {topGameHours.toFixed(1)}h
                      </span>
                    </p>
                  )}
                </div>
                <Link
                  href="/library"
                  className="text-[rgb(0,212,170)] hover:underline text-sm font-medium"
                >
                  Open Library →
                </Link>
              </div>

              {timeEntries.length > 0 ? (
                <ul className="space-y-2">
                  {timeEntries.map((e) => (
                    <li key={e.gameId}>
                      <Link
                        href={e.hrefOrPath}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors group"
                      >
                        <img
                          src={e.thumbnail}
                          alt=""
                          loading="lazy"
                          className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-semibold truncate group-hover:text-[rgb(0,212,170)] transition-colors">
                            {e.title}
                          </p>
                          {e.topScore && (
                            <p className="text-white/40 text-xs truncate">
                              {e.topScore.label}: <span className="text-white/70">{e.topScore.value}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold tabular-nums">
                            {e.hours.toFixed(1)}<span className="text-white/40 text-xs ml-0.5">h</span>
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/50 text-sm py-6 text-center">
                  Hours will populate here once games start reporting time.
                </p>
              )}
            </section>
          </div>

          {/* Right col: library preview */}
          <aside className="space-y-6">
            <section className="card-glass p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Your Library</h2>
                <Link
                  href="/library"
                  className="text-[rgb(0,212,170)] hover:underline text-xs font-medium"
                >
                  View all →
                </Link>
              </div>
              {playableGames.length > 0 ? (
                <ul className="space-y-2">
                  {playableGames.slice(0, 6).map((g) => (
                    <LibraryRow key={g.id} game={g} />
                  ))}
                </ul>
              ) : (
                <p className="text-white/50 text-sm py-4 text-center">
                  Nothing here yet.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-center min-w-[88px]">
      <p className="text-xl font-black text-white tabular-nums leading-none">{value}</p>
      <p className="text-white/50 text-[10px] uppercase tracking-wider mt-1">{label}</p>
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

function LibraryRow({ game }: { game: Game }) {
  return (
    <li>
      <Link
        href={game.href}
        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
      >
        <img
          src={game.thumbnail}
          alt=""
          loading="lazy"
          className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-semibold truncate group-hover:text-[rgb(0,212,170)] transition-colors">
            {game.title}
          </p>
          <p className="text-white/40 text-xs truncate">
            {game.isFree ? "Free" : "Owned"}
          </p>
        </div>
        <svg
          className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </li>
  );
}
