"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { GameCard } from "@/components/game-card";
import { useCart } from "@/context/cart-context";
import { GAMES } from "@/lib/games";

export default function Home() {
  const [ownsVelthara, setOwnsVelthara] = useState(false);
  const [ownsCritterColony, setOwnsCritterColony] = useState(false);
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
          setOwnsCritterColony(true);
          return;
        }
        const lib: Array<{ gameId: string }> = user.library || [];
        setOwnsVelthara(lib.some((g) => g.gameId === "veltharas-dominion"));
        setOwnsCritterColony(lib.some((g) => g.gameId === "critter-colony"));
      } catch {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  const handleAddVeltharaToCart = () => {
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

  const handleAddCritterColonyToCart = () => {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    addToCart({
      id: "critter-colony",
      title: "Critter Colony",
      price: 5,
      thumbnail: "https://d2f5lfipdzhi8t.cloudfront.net/critter-colony/thumbnail.webp",
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

  const veltharaInCart = isInCart("veltharas-dominion");
  const ccInCart = isInCart("critter-colony");
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero — dual-feature: Velthara + Critter Colony, equal billing */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-[-10%] top-[-15%] h-[32rem] w-[32rem] rounded-full bg-[rgba(0,212,170,0.10)] blur-3xl" />
          <div className="absolute right-[-8%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-[rgba(120,80,255,0.10)] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10 lg:pt-12 lg:pb-14">
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 items-stretch">
            <PromoTile
              title="Velthara's Dominion"
              eyebrow={ownsVelthara ? "Owned" : "Featured"}
              badgeClassName={ownsVelthara ? "badge-owned" : "badge-featured"}
              description="Wave survival roguelike with class-based combat and high-pressure build choices."
              bgImage="https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg"
              theme="cyan"
              action={
                ownsVelthara ? (
                  <a
                    href="https://games.zecrugames.com/veltharas-dominion/"
                    onClick={handlePlayClick}
                    className="btn-glass btn-glass-primary px-5 py-2.5 text-sm sm:text-base"
                  >
                    <span className="mr-1.5">▶</span> Play now
                  </a>
                ) : veltharaInCart ? (
                  <div className="btn-glass px-5 py-2.5 text-sm sm:text-base bg-white/10 text-white/70 cursor-default">
                    ✓ In cart
                  </div>
                ) : (
                  <button
                    onClick={handleAddVeltharaToCart}
                    className="btn-glass px-5 py-2.5 text-sm sm:text-base hover:scale-[1.02] transition-transform"
                    style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#000" }}
                  >
                    {isLoggedIn ? "Add to cart — $5" : "Login to buy"}
                  </button>
                )
              }
            />

            <PromoTile
              title="Critter Colony"
              eyebrow={ownsCritterColony ? "Owned" : "Premium"}
              badgeClassName={ownsCritterColony ? "badge-owned" : "badge-premium"}
              description="A calmer builder with automation, resource loops, and steady offline growth."
              bgImage="https://d2f5lfipdzhi8t.cloudfront.net/critter-colony/thumbnail.webp"
              theme="green"
              action={
                ownsCritterColony ? (
                  <Link
                    href="/games/critter-colony/index.html"
                    className="btn-glass btn-glass-primary px-5 py-2.5 text-sm sm:text-base"
                  >
                    <span className="mr-1.5">▶</span> Play now
                  </Link>
                ) : ccInCart ? (
                  <div className="btn-glass px-5 py-2.5 text-sm sm:text-base bg-white/10 text-white/70 cursor-default">
                    ✓ In cart
                  </div>
                ) : (
                  <button
                    onClick={handleAddCritterColonyToCart}
                    className="btn-glass px-5 py-2.5 text-sm sm:text-base hover:scale-[1.02] transition-transform"
                    style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#000" }}
                  >
                    {isLoggedIn ? "Add to cart — $5" : "Login to buy"}
                  </button>
                )
              }
            />
          </div>
        </div>
      </section>

      {/* Games Grid Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6 lg:mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Catalog</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white">Browse games</h2>
          </div>
          <Link
            href="/store"
            className="text-white/50 hover:text-white transition-colors text-sm font-medium inline-flex items-center gap-1"
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
      <footer className="border-t border-white/6 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Zecruu Games" className="h-8 w-8 rounded-lg" />
              <span className="text-white/40 text-sm">© 2026 Zecruu Games</span>
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

function PromoTile({
  title,
  eyebrow,
  badgeClassName,
  description,
  bgImage,
  theme,
  action,
}: {
  title: string;
  eyebrow: string;
  badgeClassName: string;
  description: string;
  bgImage: string;
  theme: "cyan" | "green";
  action: React.ReactNode;
}) {
  const themeClass =
    theme === "cyan"
      ? "from-[rgba(0,212,170,0.18)] to-[rgba(14,17,28,0.94)]"
      : "from-[rgba(165,214,167,0.18)] to-[rgba(14,17,28,0.94)]";

  return (
    <article className={`group h-full flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br ${themeClass} shadow-[0_20px_60px_rgba(0,0,0,0.24)] transition-transform duration-300 hover:-translate-y-1`}>
      <div className="relative aspect-[16/9] overflow-hidden flex-shrink-0">
        <img
          src={bgImage}
          alt={title}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(10,12,18)] via-[rgba(10,12,18,0.42)] to-transparent" />
        <div className="absolute left-4 top-4">
          <span className={`badge ${badgeClassName}`}>{eyebrow}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-white/60 flex-1">{description}</p>
        <div className="mt-5">{action}</div>
      </div>
    </article>
  );
}

