"use client";

import { useState } from "react";
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
    category: "card",
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
    category: "action",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Games" },
  { id: "free", label: "Free to Play" },
  { id: "action", label: "Action" },
  { id: "card", label: "Card Games" },
];

export default function StorePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGames = ALL_GAMES.filter(game => {
    const matchesCategory = 
      activeCategory === "all" || 
      (activeCategory === "free" && game.isFree) ||
      game.category === activeCategory;
    
    const matchesSearch = 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Game Store</h1>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-[rgb(0,212,170)] w-64"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-[rgb(0,212,170)] text-slate-900"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Games Grid */}
        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <p className="text-xl">No games found matching your criteria.</p>
          </div>
        )}

        {/* Coming Soon Section */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {["Blackjack Royale", "Slots Bonanza", "Roulette Master"].map((title) => (
              <div key={title} className="bg-slate-800/50 rounded-2xl overflow-hidden opacity-60 border border-slate-700">
                <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-slate-500">
                  Coming Soon
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm mb-4">Stay tuned for more amazing games!</p>
                  <span className="block w-full py-3 bg-slate-700 text-slate-400 text-center rounded-lg font-bold">
                    Coming Soon
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

