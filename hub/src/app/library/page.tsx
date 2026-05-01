"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { GameCard } from "@/components/game-card";

const ALL_GAMES = [
  {
    id: "poker",
    title: "Poker Online",
    description: "Experience the thrill of Texas Hold'em! Play with friends in real-time or challenge our trash-talking AI.",
    thumbnail: "/games/poker/poker_thumbnail.png",
    href: "/games/poker/poker.html",
    badge: "HOT",
    badgeColor: "gold" as const,
    isFree: true,
  },
  {
    id: "veltharas-dominion",
    title: "Velthara's Dominion",
    description: "Survive endless waves of enemies! Collect XP, level up, and choose powerful upgrades. How long can you last?",
    thumbnail: "https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg",
    href: "https://games.zecrugames.com/veltharas-dominion/",
    badge: "FEATURED",
    badgeColor: "green" as const,
    isFree: false,
    price: 5,
    trailerUrl: "https://games.zecrugames.com/veltharas-dominion/game-trailer.mp4",
  },
  {
    id: "zecru-tower-defense",
    title: "Zecru Tower Defense",
    description: "Build towers, stop the horde! 5 unique towers, 3 powerful Ascended towers, and 30 waves of enemies. Co-op multiplayer supported.",
    thumbnail: "/games/zecru-tower-defense/thumbnail.png",
    href: "/games/zecru-tower-defense/index.html",
    badge: "NEW",
    badgeColor: "green" as const,
    isFree: true,
  },
  {
    id: "zecru-15-clues",
    title: "Zecru 15 Clues",
    description: "One word. One chance. Can you crack the code? Give 1-word clues to help your partner guess 10 hidden words in 15 tries.",
    thumbnail: "/games/zecru-15-clues/thumbnail.svg",
    href: "/games/zecru-15-clues/index.html",
    badge: "NEW",
    badgeColor: "green" as const,
    isFree: true,
  },
  {
    id: "zecru-wordmaster",
    title: "Zecru's WordMaster",
    description: "Give clues and guess words — but avoid the doom word! A Codenames-style 2-player word game with a 5x5 grid.",
    thumbnail: "/games/zecru-wordmaster/thumbnail.svg",
    href: "/games/zecru-wordmaster/index.html",
    badge: "NEW",
    badgeColor: "green" as const,
    isFree: true,
  },
  {
    id: "realtyrush",
    title: "RealtyRush",
    description: "Buy, build, and bankrupt your friends in this real estate board game. Local & online multiplayer with stocks, cartels, and more.",
    thumbnail: "/games/realtyrush/thumbnail.svg",
    href: "/games/realtyrush/index.html",
    badge: "NEW",
    badgeColor: "green" as const,
    isFree: true,
  },
  {
    id: "critter-colony",
    title: "Critter Colony",
    description: "Capture critters, build workstations, and automate your colony! AFK gains keep your critters working while you're away.",
    thumbnail: "https://d2f5lfipdzhi8t.cloudfront.net/critter-colony/thumbnail.webp",
    href: "/games/critter-colony/index.html",
    badge: "NEW",
    badgeColor: "green" as const,
    isFree: true,
  },
  {
    id: "imposter",
    title: "Who's The Imposter?",
    description: "One word. One liar. Play in person or online — everyone gets the word except the imposter, who only gets a hint. Find the faker!",
    thumbnail: "https://games.zecrugames.com/imposter/thumbnail.png",
    href: "https://games.zecrugames.com/imposter/",
    badge: "NEW",
    badgeColor: "gold" as const,
    isFree: true,
  },
];

type FilterId = "library" | "favorites" | "wishlist";

export default function LibraryPage() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("library");
  const [search, setSearch] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ownedGames, setOwnedGames] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsLoggedIn(!!token);

    setFavorites(JSON.parse(localStorage.getItem("favorites") || "[]"));
    setWishlist(JSON.parse(localStorage.getItem("wishlist") || "[]"));

    async function fetchUserData() {
      if (!token) return;
      try {
        const res = await fetch("https://www.zecrugames.com/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          localStorage.setItem("user_data", JSON.stringify(user));
          setIsAdmin(user.isAdmin || user.isTester || false);
          const owned = (user.library || []).map((g: { gameId: string }) => g.gameId);
          setOwnedGames(owned);
        }
      } catch {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setIsAdmin(user.isAdmin || user.isTester || false);
            const owned = (user.library || []).map((g: { gameId: string }) => g.gameId);
            setOwnedGames(owned);
          } catch (e) {
            console.error("Failed to parse user data");
          }
        }
      }
    }
    fetchUserData();
  }, []);

  // Library = free games + owned paid + admin/tester gets all
  const libraryGames = useMemo(
    () => ALL_GAMES.filter((g) => g.isFree || isAdmin || ownedGames.includes(g.id)),
    [isAdmin, ownedGames]
  );
  const favoriteGames = useMemo(() => ALL_GAMES.filter((g) => favorites.includes(g.id)), [favorites]);
  const wishlistGames = useMemo(() => ALL_GAMES.filter((g) => wishlist.includes(g.id)), [wishlist]);

  const filtered = useMemo(() => {
    const source =
      activeFilter === "favorites"
        ? favoriteGames
        : activeFilter === "wishlist"
        ? wishlistGames
        : libraryGames;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (g) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
    );
  }, [activeFilter, search, libraryGames, favoriteGames, wishlistGames]);

  const filters: Array<{ id: FilterId; label: string; count: number }> = [
    { id: "library", label: "Library", count: libraryGames.length },
    { id: "favorites", label: "Favorites", count: favoriteGames.length },
    { id: "wishlist", label: "Wishlist", count: wishlistGames.length },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Header — name + summary stats */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Your Games</h1>
            <p className="text-white/50 text-sm mt-1.5">
              {libraryGames.length} {libraryGames.length === 1 ? "game" : "games"} in library
              {isAdmin && <span className="ml-2 badge badge-featured">ADMIN</span>}
            </p>
          </div>
          {!isLoggedIn && (
            <div className="text-white/50 text-sm">
              <Link href="/" className="text-[rgb(0,212,170)] hover:underline font-medium">
                Sign in
              </Link>{" "}
              to track owned games and favorites.
            </div>
          )}
        </header>

        {/* Filter row — chips + search */}
        <div className="card-glass p-3 sm:p-4 mb-8 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={
                    "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border " +
                    (active
                      ? "bg-[rgba(0,212,170,0.18)] text-[rgb(0,212,170)] border-[rgba(0,212,170,0.4)]"
                      : "bg-white/5 text-white/70 border-white/5 hover:text-white hover:bg-white/10")
                  }
                >
                  {f.label} <span className="text-white/40 ml-1">{f.count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 17.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games…"
              className="input-glass pl-10 py-2 text-sm"
            />
          </div>
        </div>

        {/* Games grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {filtered.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <EmptyState filter={activeFilter} search={search} hasAny={(activeFilter === "library" ? libraryGames : activeFilter === "favorites" ? favoriteGames : wishlistGames).length > 0} />
        )}
      </main>
    </div>
  );
}

function EmptyState({ filter, search, hasAny }: { filter: FilterId; search: string; hasAny: boolean }) {
  const isSearch = search.trim().length > 0 && hasAny;
  const message = isSearch
    ? `No games match "${search}".`
    : filter === "favorites"
    ? "No favorite games yet. Open a game and tap the star to add."
    : filter === "wishlist"
    ? "Your wishlist is empty. Browse the store to add games."
    : "Your library is empty. Free games and games you own appear here.";

  return (
    <div className="card-glass p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">
        {isSearch ? "🔍" : filter === "favorites" ? "⭐" : filter === "wishlist" ? "💝" : "📚"}
      </div>
      <p className="text-white/60 text-base mb-4 max-w-md mx-auto">{message}</p>
      {!isSearch && filter !== "library" && (
        <Link href="/store" className="btn-glass btn-glass-primary inline-flex">
          Browse Store
        </Link>
      )}
    </div>
  );
}
