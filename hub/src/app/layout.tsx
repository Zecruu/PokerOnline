import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zecruu Games - Premium Browser Games",
  description: "Play premium browser games. No downloads, just play. Texas Hold'em poker, Dots Survivor, and more!",
  keywords: "online games, browser games, poker online, survival game, Zecruu Games",
  authors: [{ name: "Zecruu Games" }],
  openGraph: {
    title: "Zecruu Games - Premium Browser Games",
    description: "Play premium browser games. No downloads, just play.",
    type: "website",
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
        {children}
      </body>
    </html>
  );
}

