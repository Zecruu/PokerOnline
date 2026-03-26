"use client";

import { useEffect, useState } from "react";

const AGE_NAMES = ["", "Dark Ages", "Feudal Era", "Crusade Age", "Renaissance", "Imperial Dominion"];

interface Kingdom {
  _id: string; name: string; level: number; age: number;
  resources: Record<string, number>;
  tickRates: Record<string, number>;
  storageCaps: Record<string, number>;
  wallHP: number; maxWallHP: number;
  buildings: { slotIndex: number; buildingId: string; tier: number }[];
  deployedUnits: string[];
  totalPrestigePoints: number; prestigeLevel: number;
  totalTicks: number;
}

interface Card {
  _id: string; cardType: string; rarity: string; name: string; lore: string;
  stats: Record<string, any>; isDeployed: boolean; isEquipped: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#8a7a62", uncommon: "#4dc880", rare: "#6aabf7", legendary: "#f5d070",
};

export default function KingdomPage() {
  const [kingdom, setKingdom] = useState<Kingdom | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const res = await fetch("/api/kc/kingdom", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setKingdom(data.kingdom);
        setCards(data.cards || []);
      }
    } catch (e) {}
    setLoading(false);
  }

  if (loading || !kingdom) return <div className="kc-loading-text">Loading...</div>;

  const r = kingdom.resources;
  const tr = kingdom.tickRates;
  const caps = kingdom.storageCaps || { gold: 50000, food: 20000, wood: 10000, stone: 8000, faith: 5000, manpower: 2000 };

  const unitCards = cards.filter(c => c.cardType === "unit");
  const spellCards = cards.filter(c => c.cardType === "spell");
  const eventCards = cards.filter(c => c.cardType === "event");
  const relicCards = cards.filter(c => c.cardType === "relic");

  return (
    <div>
      <h1 className="kc-section-title">⚔️ Kingdom Overview</h1>

      {/* Resource Production */}
      <div className="kc-grid kc-grid-3" style={{ marginBottom: 20 }}>
        {["gold", "food", "wood", "stone", "faith", "manpower"].map(res => {
          const icons: Record<string, string> = { gold: "💰", food: "🌾", wood: "🪵", stone: "🪨", faith: "✝️", manpower: "⚔️" };
          const pct = Math.min(100, (r[res] / (caps[res] || 1)) * 100);
          return (
            <div key={res} className="kc-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: "Cinzel", fontWeight: 700, textTransform: "capitalize" }}>{icons[res]} {res}</span>
                <span style={{ color: "#4dc880", fontSize: "0.75rem" }}>+{tr[res]}/tick</span>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#e8b84b" }}>
                {Math.floor(r[res]).toLocaleString()}
              </div>
              <div style={{ height: 4, background: "#28241c", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #c8972a, #e8b84b)", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: "0.65rem", color: "#8a7a62", marginTop: 2 }}>
                {Math.floor(r[res]).toLocaleString()} / {(caps[res] || 0).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kingdom Stats */}
      <div className="kc-grid kc-grid-2" style={{ marginBottom: 20 }}>
        <div className="kc-card">
          <div className="kc-card-title">🏰 Defenses</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>Wall HP</span>
            <span style={{ color: "#e8b84b" }}>{kingdom.wallHP} / {kingdom.maxWallHP}</span>
          </div>
          <div style={{ height: 6, background: "#28241c", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(kingdom.wallHP / kingdom.maxWallHP) * 100}%`, background: kingdom.wallHP / kingdom.maxWallHP > 0.5 ? "#4dc880" : "#b03030", borderRadius: 3 }} />
          </div>
          <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#8a7a62" }}>
            Buildings: {kingdom.buildings.length} / 36 slots
          </div>
        </div>

        <div className="kc-card">
          <div className="kc-card-title">📊 Stats</div>
          <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Age</span>
              <span style={{ color: "#e8b84b" }}>{AGE_NAMES[kingdom.age]}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Level</span>
              <span style={{ color: "#e8b84b" }}>{kingdom.level}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Total Ticks</span>
              <span style={{ color: "#8a7a62" }}>{kingdom.totalTicks || 0}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Prestige</span>
              <span style={{ color: "#f5d070" }}>⭐ {kingdom.prestigeLevel || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Building Grid (6x6) */}
      <div className="kc-card" style={{ marginBottom: 20 }}>
        <div className="kc-card-title">🏗️ Kingdom Grid</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
          {Array.from({ length: 36 }, (_, i) => {
            const building = kingdom.buildings.find(b => b.slotIndex === i);
            return (
              <div key={i} style={{
                aspectRatio: "1", background: building ? "rgba(200,151,42,0.12)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${building ? "rgba(200,151,42,0.3)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: building ? "0.6rem" : "0.5rem", color: building ? "#c8972a" : "#333",
                cursor: "pointer", transition: "all 0.2s",
              }}>
                {building ? building.buildingId.split("_").map(w => w[0]?.toUpperCase()).join("") : "+"}
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Hand Summary */}
      <div className="kc-card">
        <div className="kc-card-title">🃏 Card Hand ({cards.length}/40)</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Units", cards: unitCards, icon: "⚔️" },
            { label: "Spells", cards: spellCards, icon: "✨" },
            { label: "Events", cards: eventCards, icon: "📜" },
            { label: "Relics", cards: relicCards, icon: "💎" },
          ].map(({ label, cards: c, icon }) => (
            <div key={label} style={{ fontSize: "0.85rem" }}>
              <span>{icon} {label}: </span>
              <span style={{ color: "#e8b84b", fontWeight: 700 }}>{c.length}</span>
            </div>
          ))}
        </div>
        {cards.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cards.slice(0, 8).map(card => (
              <div key={card._id} style={{
                padding: "6px 10px", borderRadius: 6,
                border: `1px solid ${RARITY_COLORS[card.rarity]}33`,
                background: card.rarity === "legendary" ? "#3d2200" : card.rarity === "rare" ? "#1a2a4a" : card.rarity === "uncommon" ? "#1a3d28" : "#28241c",
                fontSize: "0.75rem",
              }}>
                <span style={{ color: RARITY_COLORS[card.rarity], fontWeight: 700 }}>{card.name}</span>
                <span style={{ color: "#8a7a62", marginLeft: 6 }}>{card.cardType}</span>
              </div>
            ))}
            {cards.length > 8 && <span style={{ color: "#8a7a62", fontSize: "0.75rem", padding: "6px 0" }}>+{cards.length - 8} more</span>}
          </div>
        )}
      </div>
    </div>
  );
}
