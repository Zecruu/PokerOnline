"use client";

import { useState } from "react";
import { useCart } from "@/context/cart-context";

const API_BASE = "https://www.zecrugames.com";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeFromCart, clearCart, total } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      closeCart();
      window.location.href = "/login";
      return;
    }

    if (items.length === 0) return;

    setIsCheckingOut(true);
    try {
      // For now, purchase the first item (can be extended for multi-item checkout)
      const gameId = items[0].id;
      const res = await fetch(`${API_BASE}/api/games/purchase/${gameId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameIds: items.map(i => i.id) }),
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        clearCart();
        window.location.href = data.checkoutUrl;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert("Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[rgb(15,15,25)] border-l border-white/10 z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🛒 Your Cart
            {items.length > 0 && (
              <span className="bg-[rgb(0,212,170)] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </h2>
          <button
            onClick={closeCart}
            className="text-white/50 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🛒</div>
              <p className="text-white/50">Your cart is empty</p>
              <p className="text-white/30 text-sm mt-2">Add some games to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-20 h-14 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{item.title}</h3>
                    <p className="text-[rgb(251,191,36)] font-bold">${item.price}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Total and Checkout */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10 bg-[rgb(15,15,25)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/70">Total</span>
              <span className="text-2xl font-bold text-white">${total}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full py-4 rounded-xl font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
            >
              {isCheckingOut ? "Processing..." : `💳 Checkout — $${total}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

