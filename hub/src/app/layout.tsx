import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zecru Games — Browser Games | Velthara's Dominion, Critter Colony",
  description: "Play Velthara's Dominion (wave survival roguelike) and Critter Colony (cozy automation builder) directly in your browser. Plus free games like Poker Online and Tower Defense. No downloads, cloud saves, instant play.",
  keywords: "Velthara's Dominion, Critter Colony, browser games, online games, wave survival, roguelike, automation game, Zecru Games, free browser games, no download",
  authors: [{ name: "Zecru Games" }],
  robots: "index, follow",
  openGraph: {
    title: "Zecru Games — Velthara's Dominion + Critter Colony",
    description: "Two flagship browser games — wave-survival action and cozy automation — plus free games. No downloads, just play.",
    type: "website",
    siteName: "Zecru Games",
    url: "https://www.zecrugames.com",
    images: [{
      url: "https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg",
      width: 1200,
      height: 630,
      alt: "Zecru Games — Velthara's Dominion",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zecru Games — Velthara's Dominion + Critter Colony",
    description: "Two flagship browser games — wave-survival action and cozy automation — plus free games. No downloads, cloud saves, instant play.",
    images: ["https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

