import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { GameCard } from "@/components/game-card";

const GAMES = [
  {
    id: "poker",
    title: "Poker Online",
    description: "Experience the thrill of Texas Hold'em! Play with friends in real-time or challenge our trash-talking AI.",
    thumbnail: "/games/poker/poker_thumbnail.png",
    href: "/games/poker/poker.html",
    badge: "HOT",
    badgeColor: "gold",
    isFree: true,
  },
  {
    id: "dots-survivor",
    title: "Dots Survivor",
    description: "Survive endless waves of enemies! Collect XP, level up, and choose powerful upgrades. How long can you last?",
    thumbnail: "/games/dots-survivor/dots_survivor_thumbnail.png",
    href: "/games/dots-survivor/dots-survivor.html",
    badge: "NEW",
    badgeColor: "green",
    isFree: true,
  },
];

const COMING_SOON = [
  { title: "Blackjack Royale", description: "Beat the dealer in this high-stakes classic. Features multiple deck shoes and side bets." },
  { title: "Slots Bonanza", description: "Spin to win with colorful themes and massive progressive jackpots." },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <header className="py-16 px-8 text-center relative">
        <div className="absolute inset-0 bg-gradient-radial from-[rgba(0,212,170,0.1)] to-transparent pointer-events-none" />
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
          Welcome to Zecruu Games
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          The ultimate destination for premium browser games. No downloads, just play.
        </p>
      </header>

      {/* Games Grid */}
      <main className="max-w-6xl mx-auto px-8 pb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🔥 Featured Games
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
          
          {/* Coming Soon Placeholders */}
          {COMING_SOON.map((game) => (
            <div key={game.title} className="bg-slate-800/50 rounded-2xl overflow-hidden opacity-60 border border-slate-700">
              <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-slate-500">
                Coming Soon
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold mb-2">{game.title}</h3>
                <p className="text-slate-400 text-sm mb-4">{game.description}</p>
                <span className="block w-full py-3 bg-slate-700 text-slate-400 text-center rounded-lg font-bold">
                  Coming Soon
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

