"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { GameCard } from "@/components/game-card";
import { useCart } from "@/context/cart-context";
import { GAMES } from "@/lib/games";

export default function Home() {
  const [ownsVelthara, setOwnsVelthara] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { addToCart, isInCart } = useCart();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsLoggedIn(!!token);

    const userData = localStorage.getItem("user_data");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.isAdmin || user.isTester) {
          setOwnsVelthara(true);
          return;
        }
        const owned = (user.library || []).some(
          (g: { gameId: string }) => g.gameId === "veltharas-dominion"
        );
        setOwnsVelthara(owned);
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    addToCart({
      id: "veltharas-dominion",
      title: "Velthara's Dominion",
      price: 5,
      thumbnail: "https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg",
    });
  };

  // Build game URL with auth tokens for cross-domain authentication
  const buildGameUrl = (baseUrl: string) => {
    const token = localStorage.getItem("auth_token");
    const rememberToken = localStorage.getItem("remember_token");
    const userData = localStorage.getItem("user_data");

    if (!token) return baseUrl;

    const url = new URL(baseUrl);
    url.searchParams.set("auth_token", token);
    if (rememberToken) {
      url.searchParams.set("remember_token", rememberToken);
    }
    if (userData) {
      url.searchParams.set("user_data", encodeURIComponent(userData));
    }
    return url.toString();
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const gameUrl = buildGameUrl("https://games.zecrugames.com/veltharas-dominion/");
    window.location.href = gameUrl;
  };

  const inCart = isInCart("veltharas-dominion");
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero — dual-feature: Velthara + Critter Colony */}
      <section className="relative overflow-hidden">
        {/* Soft ambient backdrop blending the two key arts */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg')",
              filter: "blur(60px) brightness(0.25)",
              transform: "scale(1.2)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(10,10,20,0.4)] via-transparent to-[rgb(10,10,20)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10 lg:pt-12 lg:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Velthara feature card */}
            <FeatureCard
              title="Velthara's Dominion"
              accent="cyan"
              tagline="ROGUELIKE SURVIVOR"
              description="Survive endless waves in this action-packed roguelike. Collect XP, level up, unlock upgrades, and see how long you last."
              bgImage="https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg"
              badge={ownsVelthara ? "OWNED" : "FEATURED"}
              badgeKind={ownsVelthara ? "owned" : "featured"}
              action={
                ownsVelthara ? (
                  <a
                    href="https://games.zecrugames.com/veltharas-dominion/"
                    onClick={handlePlayClick}
                    className="btn-glass btn-glass-primary text-sm sm:text-base px-6 sm:px-7 py-3"
                  >
                    <span className="mr-1.5">▶</span> Play Now
                  </a>
                ) : inCart ? (
                  <div className="btn-glass text-sm sm:text-base px-6 sm:px-7 py-3 bg-white/10 text-white/70 cursor-default">
                    ✓ In Cart
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="btn-glass text-sm sm:text-base px-6 sm:px-7 py-3 hover:scale-[1.02] transition-transform"
                    style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#000" }}
                  >
                    {isLoggedIn ? "Add to Cart — $5" : "Login to Purchase"}
                  </button>
                )
              }
            />

            {/* Critter Colony feature card */}
            <FeatureCard
              title="Critter Colony"
              accent="green"
              tagline="COZY AUTOMATION"
              description="Capture critters, build workstations, and automate your colony. AFK gains keep your critters working while you're away."
              bgImage="https://d2f5lfipdzhi8t.cloudfront.net/critter-colony/thumbnail.webp"
              badge="FREE • NEW"
              badgeKind="free"
              action={
                <Link
                  href="/games/critter-colony/index.html"
                  className="btn-glass btn-glass-primary text-sm sm:text-base px-6 sm:px-7 py-3"
                >
                  <span className="mr-1.5">▶</span> Play Now
                </Link>
              }
            />
          </div>
        </div>
      </section>

      {/* Games Grid Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-20">
        <div className="flex items-center justify-between mb-8 lg:mb-10">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {GAMES.map((game, index) => (
            <div key={game.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}>
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
              <span className="text-white/40 text-sm">© 2026 Zecruu Games. All rights reserved.</span>
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

function FeatureCard({
  title,
  accent,
  tagline,
  description,
  bgImage,
  badge,
  badgeKind,
  action,
}: {
  title: string;
  accent: "cyan" | "green";
  tagline: string;
  description: string;
  bgImage: string;
  badge: string;
  badgeKind: "featured" | "owned" | "free";
  action: React.ReactNode;
}) {
  const accentText = accent === "cyan" ? "text-[rgb(0,212,170)]" : "text-[rgb(165,214,167)]";
  const accentGlow =
    accent === "cyan"
      ? "from-[rgba(0,212,170,0.18)] to-[rgba(120,80,255,0.12)]"
      : "from-[rgba(165,214,167,0.18)] to-[rgba(255,193,7,0.12)]";
  const badgeClass =
    badgeKind === "owned" ? "badge-owned" : badgeKind === "free" ? "badge-free" : "badge-featured";

  return (
    <div className="group relative animate-slide-up">
      {/* Subtle accent glow behind the card */}
      <div className={`absolute -inset-2 bg-gradient-to-br ${accentGlow} rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      <article className="relative card-glass overflow-hidden">
        {/* Hero art */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={bgImage}
            alt={title}
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          {/* Readability gradient — heavier at bottom for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgb(15,15,25)] via-[rgba(15,15,25,0.6)] to-transparent" />
          {/* Top badge */}
          <div className="absolute top-4 left-4">
            <span className={`badge ${badgeClass}`}>{badge}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          <p className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5 ${accentText}`}>
            {tagline}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-2.5">
            {title}
          </h2>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4 line-clamp-2">
            {description}
          </p>
          <div>{action}</div>
        </div>
      </article>
    </div>
  );
}

