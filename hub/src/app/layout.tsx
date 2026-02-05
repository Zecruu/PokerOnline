import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zecruu Games - Browser Games | Velthara's Dominion, Poker Online",
  description: "Play Velthara's Dominion, a wave survival roguelike, and Poker Online directly in your browser. No downloads needed. Leaderboards, cloud saves, and more.",
  keywords: "Velthara's Dominion, Veltharas Dominion, browser games, online games, wave survival game, roguelike, poker online, Zecruu Games, free browser games",
  authors: [{ name: "Zecruu Games" }],
  robots: "index, follow",
  openGraph: {
    title: "Zecruu Games - Browser Games | Velthara's Dominion",
    description: "Play Velthara's Dominion and Poker Online directly in your browser. No downloads, just play.",
    type: "website",
    siteName: "Zecruu Games",
    url: "https://www.zecrugames.com",
    images: [{
      url: "https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg",
      width: 1200,
      height: 630,
      alt: "Zecruu Games - Velthara's Dominion",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zecruu Games - Browser Games | Velthara's Dominion",
    description: "Play Velthara's Dominion and Poker Online in your browser. No downloads needed.",
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

