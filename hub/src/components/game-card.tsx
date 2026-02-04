"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/context/cart-context";

interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  href: string;
  badge?: string;
  badgeColor?: "gold" | "green";
  isFree?: boolean;
  price?: number;
}

export function GameCard({ game }: { game: Game }) {
  const [ownsGame, setOwnsGame] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { addToCart, isInCart } = useCart();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsLoggedIn(!!token);

    if (game.isFree) {
      setOwnsGame(true);
      return;
    }

    // Check user data for ownership
    const userData = localStorage.getItem("user_data");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        // Admin/tester get free access
        if (user.isAdmin || user.isTester) {
          setOwnsGame(true);
          return;
        }
        // Check library
        const owned = (user.library || []).some(
          (g: { gameId: string }) => g.gameId === game.id || g.gameId === "veltharas-dominion"
        );
        setOwnsGame(owned);
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, [game.id, game.isFree]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    addToCart({
      id: game.id,
      title: game.title,
      price: game.price || 0,
      thumbnail: game.thumbnail,
    });
  };

  const inCart = isInCart(game.id);

  // Build game URL with auth tokens for cross-domain authentication
  const buildGameUrl = (baseUrl: string) => {
    const token = localStorage.getItem("auth_token");
    const rememberToken = localStorage.getItem("remember_token");
    const userData = localStorage.getItem("user_data");

    // Only add tokens for external game URLs
    if (!baseUrl.includes("games.zecrugames.com")) return baseUrl;
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
    const gameUrl = buildGameUrl(game.href);
    window.location.href = gameUrl;
  };

  // For free games or owned paid games, show as a clickable card
  if (game.isFree || ownsGame) {
    return (
      <a href={game.href} onClick={handlePlayClick} className="group card-glass overflow-hidden block">
        <GameCardContent game={game} ownsGame={ownsGame} isFree={game.isFree} />
      </a>
    );
  }

  // For paid games not owned, show as a div with add to cart button
  return (
    <div className="group card-glass overflow-hidden block cursor-pointer">
      <GameCardContent
        game={game}
        ownsGame={false}
        isFree={false}
        onAddToCart={handleAddToCart}
        inCart={inCart}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}

function GameCardContent({
  game,
  ownsGame,
  isFree,
  onAddToCart,
  inCart,
  isLoggedIn,
}: {
  game: Game;
  ownsGame: boolean;
  isFree?: boolean;
  onAddToCart?: (e: React.MouseEvent) => void;
  inCart?: boolean;
  isLoggedIn?: boolean;
}) {
  return (
    <>
      <div className="relative h-44 overflow-hidden">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(20,20,30)] via-transparent to-transparent opacity-60" />
        <div className="absolute top-4 left-4 flex gap-2">
          {isFree ? (
            <span className="badge badge-free">FREE</span>
          ) : ownsGame ? (
            <span className="badge badge-owned">OWNED</span>
          ) : (
            <span className="badge badge-premium">PREMIUM</span>
          )}
        </div>
        {game.badge && (
          <div className="absolute top-4 right-4">
            <span className={`badge ${game.badgeColor === "green" ? "badge-featured" : "badge-hot"}`}>
              {game.badge}
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[rgb(0,212,170)] transition-colors">
          {game.title}
        </h3>
        <p className="text-white/50 text-sm mb-5 line-clamp-2 leading-relaxed">{game.description}</p>
        <div className="relative">
          {isFree || ownsGame ? (
            <div className="btn-glass btn-glass-primary w-full justify-center group-hover:shadow-lg group-hover:shadow-[rgba(0,212,170,0.2)]">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play Now
            </div>
          ) : inCart ? (
            <div className="btn-glass w-full justify-center bg-white/10 text-white/70 cursor-default">
              ✓ In Cart
            </div>
          ) : (
            <button
              onClick={onAddToCart}
              className="btn-glass w-full justify-center group-hover:shadow-lg transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#000" }}
            >
              {isLoggedIn ? (
                <>🛒 Add to Cart — ${game.price}</>
              ) : (
                <>🔑 Login to Purchase</>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

