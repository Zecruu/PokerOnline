"use client";

import { ReactNode } from "react";
import { CartProvider } from "@/context/cart-context";
import { CartSidebar } from "@/components/cart-sidebar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartSidebar />
    </CartProvider>
  );
}

