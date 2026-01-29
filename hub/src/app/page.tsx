import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { GameCard } from "@/components/game-card";

const GAMES: Array<{
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  href: string;
  badge: string;
  badgeColor: "gold" | "green";
  isFree: boolean;
}> = [
  {
    id: "dots-survivor",
    title: "Dots Survivor",
    description: "Survive endless waves of enemies! Collect XP, level up, and choose powerful upgrades. How long can you last?",
    thumbnail: "/games/dots-survivor/dots_survivor_thumbnail.png",
    href: "/games/dots-survivor/dots-survivor.html",
    badge: "FEATURED",
    badgeColor: "green",
    isFree: true,
  },
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
];



export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Banner - Dots Survivor Showcase */}
      <section className="relative overflow-hidden min-h-[500px]">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/games/dots-survivor/dots_survivor_thumbnail.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/30" />

        <div className="relative max-w-5xl mx-auto px-12 lg:px-16 py-20 min-h-[500px] flex items-center justify-between gap-16">
          <div className="max-w-xl flex-shrink-0">
            <span className="inline-block px-4 py-2 bg-[rgb(0,212,170)] text-slate-900 text-sm font-bold rounded-full mb-6">
              🎮 FEATURED GAME
            </span>
            <h1 className="text-5xl font-extrabold mb-6 text-white leading-tight">
              Dots Survivor
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Survive endless waves of enemies in this action-packed roguelike!
              Collect XP, level up, unlock powerful upgrades, and see how long you can last.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/games/dots-survivor/dots-survivor.html"
                className="px-8 py-4 bg-[rgb(0,212,170)] hover:bg-[rgb(0,180,145)] text-slate-900 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-[rgba(0,212,170,0.3)]"
              >
                ▶ Play Now - Free
              </Link>
              <Link
                href="/store/"
                className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-lg transition-colors"
              >
                Browse Store
              </Link>
            </div>
          </div>

          {/* Game Preview */}
          <div className="hidden lg:flex items-center justify-center flex-shrink-0">
            <div className="relative">
              <img
                src="/games/dots-survivor/dots_survivor_thumbnail.png"
                alt="Dots Survivor"
                className="w-96 rounded-2xl shadow-2xl border-2 border-slate-700"
              />
              <div className="absolute -bottom-4 -right-4 px-4 py-2 bg-green-500 text-white font-bold rounded-lg shadow-lg">
                FREE TO PLAY
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <main className="max-w-5xl mx-auto px-12 lg:px-16 py-16">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
          🔥 All Games
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </main>
    </div>
  );
}

