"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Kingdom", href: "/kingdom-conquest", icon: "🏰" },
  { label: "Build", href: "/kingdom-conquest/build", icon: "🔨" },
  { label: "Cards", href: "/kingdom-conquest/cards", icon: "🃏" },
  { label: "World Map", href: "/kingdom-conquest/world-map", icon: "🗺️" },
  { label: "Market", href: "/kingdom-conquest/market", icon: "💰" },
  { label: "Alliance", href: "/kingdom-conquest/alliance", icon: "⚔️" },
];

interface Resources {
  gold: number; food: number; wood: number; stone: number; faith: number; manpower: number;
}

interface TickRates {
  gold: number; food: number; wood: number; stone: number; faith: number; manpower: number;
}

interface Kingdom {
  _id: string;
  name: string;
  level: number;
  age: number;
  resources: Resources;
  tickRates: TickRates;
  wallHP: number;
  maxWallHP: number;
  buildings: any[];
}

const AGE_NAMES = ["", "Dark Ages", "Feudal Era", "Crusade Age", "Renaissance", "Imperial Dominion"];
const AGE_COLORS = ["", "#8a7a62", "#4dc880", "#6aabf7", "#f5d070", "#ff8c00"];

export default function KCLayout({ children }: { children: React.ReactNode }) {
  const [kingdom, setKingdom] = useState<Kingdom | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadKingdom();
    // Poll for tick updates every 5 seconds
    const interval = setInterval(loadKingdom, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadKingdom() {
    const token = localStorage.getItem("auth_token");
    if (!token) { setLoading(false); return; }

    try {
      const res = await fetch("/api/kc/kingdom", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        // No kingdom — create one
        const createRes = await fetch("/api/kc/kingdom/create", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "New Kingdom" }),
        });
        const data = await createRes.json();
        if (data.success) setKingdom(data.kingdom);
      } else {
        const data = await res.json();
        if (data.success) setKingdom(data.kingdom);
      }
    } catch (e) {
      console.error("Failed to load kingdom:", e);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="kc-loading">
        <div className="kc-loading-text">⚔️ Entering the Kingdom...</div>
      </div>
    );
  }

  if (!kingdom) {
    return (
      <div className="kc-loading">
        <div className="kc-loading-text">Please log in to play Kingdom Conquest</div>
      </div>
    );
  }

  const r = kingdom.resources;
  const tr = kingdom.tickRates;

  return (
    <div className="kc-root">
      {/* Top Bar */}
      <header className="kc-topbar">
        <div className="kc-topbar-left">
          <span className="kc-kingdom-name">{kingdom.name}</span>
          <span className="kc-age" style={{ color: AGE_COLORS[kingdom.age] }}>
            {AGE_NAMES[kingdom.age]}
          </span>
          <span className="kc-level">Lv.{kingdom.level}</span>
        </div>
        <div className="kc-topbar-resources">
          <span className="kc-res" title={`+${tr.gold}/tick`}>💰 {Math.floor(r.gold).toLocaleString()}</span>
          <span className="kc-res" title={`+${tr.food}/tick`}>🌾 {Math.floor(r.food).toLocaleString()}</span>
          <span className="kc-res" title={`+${tr.wood}/tick`}>🪵 {Math.floor(r.wood).toLocaleString()}</span>
          <span className="kc-res" title={`+${tr.stone}/tick`}>🪨 {Math.floor(r.stone).toLocaleString()}</span>
          <span className="kc-res" title={`+${tr.faith}/tick`}>✝️ {Math.floor(r.faith).toLocaleString()}</span>
          <span className="kc-res" title={`+${tr.manpower}/tick`}>⚔️ {Math.floor(r.manpower).toLocaleString()}</span>
        </div>
        <div className="kc-topbar-right">
          <span className="kc-wall">🏰 {kingdom.wallHP}/{kingdom.maxWallHP}</span>
          <Link href="/" className="kc-home-btn">Hub</Link>
        </div>
      </header>

      {/* Navigation */}
      <nav className="kc-nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="kc-nav-item">
            <span className="kc-nav-icon">{item.icon}</span>
            <span className="kc-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Main Content */}
      <main className="kc-main">
        {children}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

        .kc-root { min-height: 100vh; background: #0e0d0b; color: #c8b89a; font-family: 'Crimson Text', serif; }

        /* Top Bar */
        .kc-topbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: #161410; border-bottom: 1px solid rgba(200,151,42,0.18); position: sticky; top: 0; z-index: 50; }
        .kc-topbar-left { display: flex; align-items: center; gap: 12px; }
        .kc-kingdom-name { font-family: 'Cinzel', serif; font-weight: 900; font-size: 1.1rem; color: #e8b84b; }
        .kc-age { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .kc-level { font-size: 0.75rem; color: #8a7a62; font-weight: 600; }
        .kc-topbar-resources { display: flex; gap: 14px; }
        .kc-res { font-size: 0.8rem; font-weight: 600; cursor: help; }
        .kc-topbar-right { display: flex; align-items: center; gap: 12px; }
        .kc-wall { font-size: 0.75rem; color: #8a7a62; }
        .kc-home-btn { font-size: 0.7rem; padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(200,151,42,0.3); color: #c8972a; text-decoration: none; }
        .kc-home-btn:hover { background: rgba(200,151,42,0.1); }

        /* Nav */
        .kc-nav { display: flex; justify-content: center; gap: 4px; padding: 6px 16px; background: #121110; border-bottom: 1px solid rgba(200,151,42,0.1); }
        .kc-nav-item { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 6px; color: #8a7a62; text-decoration: none; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; }
        .kc-nav-item:hover { background: rgba(200,151,42,0.08); color: #c8b89a; }
        .kc-nav-icon { font-size: 1rem; }
        .kc-nav-label { font-family: 'Cinzel', serif; }

        /* Main */
        .kc-main { padding: 16px; max-width: 1200px; margin: 0 auto; }

        /* Loading */
        .kc-loading { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0e0d0b; }
        .kc-loading-text { font-family: 'Cinzel', serif; font-size: 1.5rem; color: #c8972a; }

        /* Card Styles */
        .kc-card { background: #1e1b15; border: 1px solid rgba(200,151,42,0.18); border-radius: 10px; padding: 14px; }
        .kc-card-title { font-family: 'Cinzel', serif; font-weight: 700; font-size: 1rem; color: #e8b84b; margin-bottom: 6px; }
        .kc-card-desc { font-size: 0.8rem; color: #8a7a62; line-height: 1.5; }
        .kc-btn { padding: 8px 18px; border-radius: 6px; border: 1px solid rgba(200,151,42,0.3); background: rgba(200,151,42,0.1); color: #c8972a; font-family: 'Cinzel', serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .kc-btn:hover { background: rgba(200,151,42,0.2); transform: translateY(-1px); }
        .kc-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .kc-btn-danger { border-color: rgba(139,32,32,0.4); background: rgba(139,32,32,0.1); color: #b03030; }
        .kc-section-title { font-family: 'Cinzel', serif; font-weight: 900; font-size: 1.2rem; color: #e8b84b; margin-bottom: 12px; }

        /* Grid */
        .kc-grid { display: grid; gap: 12px; }
        .kc-grid-2 { grid-template-columns: 1fr 1fr; }
        .kc-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        .kc-grid-4 { grid-template-columns: repeat(4, 1fr); }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0e0d0b; }
        ::-webkit-scrollbar-thumb { background: rgba(200,151,42,0.2); border-radius: 3px; }
      `}</style>
    </div>
  );
}
