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
    category: "strategy",
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
    category: "strategy",
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
    category: "strategy",
  },
  {
    id: "realtyrush",
    title: "RealtyRush",
    description: "A strategic real estate board game for 2-6 players. Buy properties, collect rent, play cartel cards, and bankrupt your rivals.",
    thumbnail: "/games/realtyrush/thumbnail.svg",
    href: "/games/realtyrush/index.html",
    badge: "NEW",
    badgeColor: "green" as const,
    isFree: true,
    category: "strategy",
  },
  {
    id: "critter-colony",
    title: "Critter Colony",
    description: "Capture critters, build workstations, and automate your colony! AFK gains keep your critters working while you're away.",
    thumbnail: "/games/critter-colony/thumbnail.svg",
    href: "/games/critter-colony/index.html",
    badge: "NEW",
    badgeColor: "green" as const,
    isFree: true,
    category: "strategy",
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
    category: "party",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Games" },
  { id: "free", label: "Free to Play" },
  { id: "action", label: "Action" },
  { id: "card", label: "Card Games" },
  { id: "strategy", label: "Strategy" },
  { id: "party", label: "Party" },
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

      </main>
    </div>
  );
}

