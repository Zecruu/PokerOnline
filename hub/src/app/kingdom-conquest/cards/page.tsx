"use client";

import { useEffect, useState } from "react";

interface Card {
  _id: string; cardType: string; rarity: string; name: string; lore: string;
  stats: Record<string, any>; isDeployed: boolean; isEquipped: boolean;
  imageUrl?: string;
}

const CDN = "https://d2f5lfipdzhi8t.cloudfront.net/kingdom-conquest";
const BG_IMAGES: Record<string, string> = {
  common: `${CDN}/backgrounds/bg-common.png`,
  uncommon: `${CDN}/backgrounds/bg-uncommon.png`,
  rare: `${CDN}/backgrounds/bg-rare.png`,
  legendary: `${CDN}/backgrounds/bg-legendary.png`,
};

const RARITY_BG: Record<string, string> = { common: "#28241c", uncommon: "#1a3d28", rare: "#1a2a4a", legendary: "#3d2200" };
const RARITY_TEXT: Record<string, string> = { common: "#8a7a62", uncommon: "#4dc880", rare: "#6aabf7", legendary: "#f5d070" };
const RARITY_BORDER: Record<string, string> = { common: "#3a3428", uncommon: "#2d6640", rare: "#2a4472", legendary: "#c8972a" };
const TYPE_ICONS: Record<string, string> = { unit: "⚔️", spell: "✨", event: "📜", relic: "💎", building: "🏗️" };
const DRAW_COSTS: Record<string, number> = { common: 500, uncommon: 1500, rare: 4000, legendary: 12000 };

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [gold, setGold] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [lastDrawn, setLastDrawn] = useState<Card | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadCards(); }, []);

  async function loadCards() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const res = await fetch("/api/kc/kingdom", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      setCards(data.cards || []);
      setGold(data.kingdom.resources.gold || 0);
    }
  }

  async function drawCard() {
    if (drawing) return;
    setDrawing(true);
    setLastDrawn(null);
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch("/api/kc/cards/draw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setLastDrawn(data.card);
        setGold(data.remainingGold);
        setCards(prev => [...prev, data.card]);
      } else {
        alert(data.error || "Failed to draw");
      }
    } catch (e) { alert("Draw failed"); }
    setDrawing(false);
  }

  async function playCard(cardId: string, action: string) {
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/kc/cards/play", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, action }),
    });
    const data = await res.json();
    if (data.success) loadCards();
    else alert(data.error || "Failed");
  }

  const filtered = cards.filter(c => filter === "all" || c.cardType === filter);

  return (
    <div>
      <h1 className="kc-section-title">🃏 Cards ({cards.length}/40)</h1>

      {/* Draw Section */}
      <div className="kc-card" style={{ marginBottom: 16, textAlign: "center" }}>
        <div className="kc-card-title">Draw a New Card</div>
        <p style={{ fontSize: "0.8rem", color: "#8a7a62", marginBottom: 12 }}>
          Costs gold based on rarity rolled. Rarity is random!<br/>
          Common: 500g | Uncommon: 1,500g | Rare: 4,000g | Legendary: 12,000g
        </p>
        <p style={{ fontSize: "0.9rem", marginBottom: 12 }}>Your Gold: <strong style={{ color: "#e8b84b" }}>💰 {Math.floor(gold).toLocaleString()}</strong></p>
        <button className="kc-btn" onClick={drawCard} disabled={drawing || gold < 500 || cards.length >= 40} style={{ fontSize: "1rem", padding: "12px 32px" }}>
          {drawing ? "🎴 Drawing..." : cards.length >= 40 ? "Hand Full!" : gold < 500 ? "Not Enough Gold" : "🎴 Draw Card (500+ Gold)"}
        </button>
      </div>

      {/* Last Drawn Card — Reveal */}
      {lastDrawn && (
        <div style={{
          marginBottom: 16, padding: 24, borderRadius: 14,
          background: RARITY_BG[lastDrawn.rarity],
          border: `2px solid ${RARITY_BORDER[lastDrawn.rarity]}`,
          textAlign: "center",
          boxShadow: `0 0 30px ${RARITY_BORDER[lastDrawn.rarity]}40`,
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: RARITY_TEXT[lastDrawn.rarity], marginBottom: 6 }}>
            ✦ NEW {lastDrawn.rarity} {lastDrawn.cardType} ✦
          </div>
          <div style={{ fontFamily: "Cinzel", fontSize: "1.5rem", fontWeight: 900, color: RARITY_TEXT[lastDrawn.rarity], marginBottom: 8 }}>
            {lastDrawn.name}
          </div>
          {lastDrawn.lore && (
            <div style={{ fontStyle: "italic", color: "#8a7a62", fontSize: "0.85rem", marginBottom: 12, lineHeight: 1.6 }}>
              "{lastDrawn.lore}"
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {Object.entries(lastDrawn.stats || {}).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
              <span key={k} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", fontSize: "0.8rem", color: "#c8b89a", fontWeight: 600 }}>
                {k}: {typeof v === "boolean" ? (v ? "Yes" : "No") : v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["all", "unit", "spell", "event", "relic", "building"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="kc-btn" style={{
            background: filter === f ? "rgba(200,151,42,0.2)" : undefined,
            textTransform: "capitalize", fontSize: "0.78rem", padding: "5px 12px",
          }}>
            {f === "all" ? `All (${cards.length})` : `${TYPE_ICONS[f]} ${f} (${cards.filter(c => c.cardType === f).length})`}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      <div className="kc-grid kc-grid-2">
        {filtered.map(card => (
          <div key={card._id} style={{
            borderRadius: 10,
            background: RARITY_BG[card.rarity],
            border: `1px solid ${RARITY_BORDER[card.rarity]}`,
            overflow: "hidden",
          }}>
            {/* Card Art with Rarity Background */}
            <div style={{
              height: 140, position: "relative",
              backgroundImage: `url(${BG_IMAGES[card.rarity]})`,
              backgroundSize: "cover", backgroundPosition: "center",
            }}>
              {card.imageUrl && (
                <img src={card.imageUrl} alt={card.name} style={{
                  position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                  height: "130%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
                }} />
              )}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 40,
                background: `linear-gradient(transparent, ${RARITY_BG[card.rarity]})`,
              }} />
              <span style={{
                position: "absolute", top: 6, right: 8, fontSize: "0.6rem", fontWeight: 700,
                textTransform: "uppercase", color: RARITY_TEXT[card.rarity], letterSpacing: 1,
                background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4,
              }}>
                {card.rarity}
              </span>
            </div>
            <div style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: "Cinzel", fontWeight: 700, color: RARITY_TEXT[card.rarity], fontSize: "0.95rem" }}>
                {TYPE_ICONS[card.cardType]} {card.name}
              </span>
              <span style={{ fontSize: "0.65rem", color: "#8a7a62", textTransform: "uppercase" }}>
                {card.cardType}
              </span>
            </div>
            {card.lore && <div style={{ fontSize: "0.75rem", color: "#8a7a62", fontStyle: "italic", marginBottom: 6, lineHeight: 1.4 }}>"{card.lore}"</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {Object.entries(card.stats || {}).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
                <span key={k} style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)", fontSize: "0.72rem", color: "#c8b89a" }}>
                  {k}: {typeof v === "boolean" ? (v ? "✓" : "✗") : v}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {card.cardType === "unit" && (
                <button className="kc-btn" style={{ fontSize: "0.7rem", padding: "3px 10px" }} onClick={() => playCard(card._id, card.isDeployed ? "undeploy" : "deploy")}>
                  {card.isDeployed ? "Undeploy" : "⚔️ Deploy"}
                </button>
              )}
              {card.cardType === "relic" && (
                <button className="kc-btn" style={{ fontSize: "0.7rem", padding: "3px 10px" }} onClick={() => playCard(card._id, card.isEquipped ? "unequip" : "equip")}>
                  {card.isEquipped ? "Unequip" : "💎 Equip"}
                </button>
              )}
              {card.cardType === "event" && (
                <button className="kc-btn" style={{ fontSize: "0.7rem", padding: "3px 10px" }} onClick={() => playCard(card._id, "activate")}>📜 Activate</button>
              )}
              <button className="kc-btn kc-btn-danger" style={{ fontSize: "0.68rem", padding: "3px 8px" }} onClick={() => { if (confirm("Discard this card?")) playCard(card._id, "discard"); }}>
                🗑️ +{Math.floor(DRAW_COSTS[card.rarity] * 0.1)}g
              </button>
              {(card.isDeployed || card.isEquipped) && (
                <span style={{ fontSize: "0.65rem", color: "#4dc880", fontWeight: 600 }}>
                  {card.isDeployed ? "⚔️ Active" : "💎 Equipped"}
                </span>
              )}
            </div>
            </div>{/* close padding div */}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#8a7a62", padding: 30, fontSize: "0.9rem" }}>
          {cards.length === 0 ? "No cards yet — draw your first card above!" : "No cards match this filter."}
        </div>
      )}
    </div>
  );
}
