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
    title: "Velthara's Dominion",
    description: "Survive endless waves of enemies! Collect XP, level up, and choose powerful upgrades. How long can you last?",
    thumbnail: "/games/dots-survivor/velthara-bg.jpg",
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

      {/* Hero Banner - Premium Showcase */}
      <section className="relative overflow-hidden min-h-[600px]">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{
              backgroundImage: "url('/games/dots-survivor/velthara-bg.jpg')",
              filter: "blur(40px) brightness(0.3)"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(10,10,20)] via-transparent to-[rgb(10,10,20)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgb(10,10,20)] via-transparent to-[rgb(10,10,20)]/80" />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-24 min-h-[600px] flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
            {/* Text Content */}
            <div className="animate-slide-up">
              <span className="badge badge-featured mb-6 inline-flex items-center gap-2">
                <span className="w-2 h-2 bg-[rgb(0,212,170)] rounded-full animate-pulse" />
                FEATURED GAME
              </span>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 text-white leading-[1.1] tracking-tight">
                Velthara's<br />
                <span className="text-gradient">Dominion</span>
              </h1>

              <p className="text-lg sm:text-xl text-white/60 mb-10 leading-relaxed max-w-lg">
                Survive endless waves of enemies in this action-packed roguelike.
                Collect XP, level up, unlock powerful upgrades, and see how long you can last.
              </p>

              <div className="flex gap-4 flex-wrap">
                <Link
                  href="/games/dots-survivor/dots-survivor.html"
                  className="btn-glass btn-glass-primary text-base sm:text-lg px-8 sm:px-10 py-4"
                >
                  <span className="mr-2">▶</span> Play Now — Free
                </Link>
                <Link
                  href="/store/"
                  className="btn-glass btn-glass-secondary text-base sm:text-lg px-6 sm:px-8 py-4"
                >
                  Browse Store
                </Link>
              </div>
            </div>

            {/* Game Preview Card */}
            <div className="hidden lg:block animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                {/* Glow effect behind card */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[rgb(0,212,170)]/20 to-[rgb(120,80,255)]/20 rounded-3xl blur-2xl opacity-50" />

                <div className="relative card-glass p-3 animate-float">
                  <img
                    src="/games/dots-survivor/velthara-bg.jpg"
                    alt="Velthara's Dominion"
                    className="w-full aspect-video object-cover rounded-xl"
                  />

                  {/* Overlay info */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div>
                      <span className="badge badge-free text-xs">FREE TO PLAY</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                        2.4k
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Games Grid Section */}
      <main className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 text-white">
            <span className="text-3xl">🎮</span> All Games
          </h2>
          <Link
            href="/store"
            className="text-white/50 hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {GAMES.map((game, index) => (
            <div key={game.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Zecruu Games" className="h-8 w-8 rounded-lg" />
              <span className="text-white/40 text-sm">© 2025 Zecruu Games. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-white/40 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

