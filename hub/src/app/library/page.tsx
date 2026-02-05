"use client";

import { useState, useEffect } from "react";
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
    id: "stripe-test",
    title: "Stripe Test Game",
    description: "A 50 cent test game to verify Stripe checkout and ownership verification works correctly.",
    thumbnail: "/games/poker/poker_thumbnail.png",
    href: "https://games.zecrugames.com/stripe-test/",
    badge: "TEST",
    badgeColor: "gold" as const,
    isFree: false,
    price: 0.50,
  },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"library" | "wishlist" | "favorites">("library");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ownedGames, setOwnedGames] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsLoggedIn(!!token);

    // Load favorites/wishlist from localStorage for now
    setFavorites(JSON.parse(localStorage.getItem("favorites") || "[]"));
    setWishlist(JSON.parse(localStorage.getItem("wishlist") || "[]"));

    // Fetch fresh user data from API to get current library
    async function fetchUserData() {
      if (!token) return;

      try {
        const res = await fetch("https://www.zecrugames.com/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          // Update localStorage with fresh data
          localStorage.setItem("user_data", JSON.stringify(user));
          setIsAdmin(user.isAdmin || user.isTester || false);
          const owned = (user.library || []).map((g: { gameId: string }) => g.gameId);
          setOwnedGames(owned);
        }
      } catch (e) {
        // Fallback to cached data
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

  // Library includes: free games + owned paid games + all games for admin/tester
  const libraryGames = ALL_GAMES.filter(g => g.isFree || isAdmin || ownedGames.includes(g.id));
  const favoriteGames = ALL_GAMES.filter(g => favorites.includes(g.id));
  const wishlistGames = ALL_GAMES.filter(g => wishlist.includes(g.id));

  const getActiveGames = () => {
    switch (activeTab) {
      case "favorites": return favoriteGames;
      case "wishlist": return wishlistGames;
      default: return libraryGames;
    }
  };

  const tabs = [
    { id: "library", label: "My Library", count: libraryGames.length },
    { id: "favorites", label: "⭐ Favorites", count: favoriteGames.length },
    { id: "wishlist", label: "💝 Wishlist", count: wishlistGames.length },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Games</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[rgb(0,212,170)] text-slate-900"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Games Grid */}
        {getActiveGames().length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {getActiveGames().map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <p className="text-xl mb-4">
              {activeTab === "favorites" && "No favorite games yet. Add some from your library!"}
              {activeTab === "wishlist" && "Your wishlist is empty. Browse the store!"}
              {activeTab === "library" && "Your library is empty."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

