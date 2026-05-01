// Single source of truth for the game catalog. Used by the homepage,
// library, and profile so ownership counts and listings stay in sync.

export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  href: string;
  badge: string;
  badgeColor: "gold" | "green";
  isFree: boolean;
  price?: number;
  trailerUrl?: string;
}

export const GAMES: Game[] = [
  {
    id: "veltharas-dominion",
    title: "Velthara's Dominion",
    description:
      "Survive endless waves of enemies! Collect XP, level up, and choose powerful upgrades. How long can you last?",
    thumbnail: "https://games.zecrugames.com/veltharas-dominion/velthara-bg.jpg",
    href: "https://games.zecrugames.com/veltharas-dominion/",
    badge: "FEATURED",
    badgeColor: "green",
    isFree: false,
    price: 5,
    trailerUrl: "https://games.zecrugames.com/veltharas-dominion/game-trailer.mp4",
  },
  {
    id: "poker",
    title: "Poker Online",
    description:
      "Experience the thrill of Texas Hold'em! Play with friends in real-time or challenge our trash-talking AI.",
    thumbnail: "/games/poker/poker_thumbnail.png",
    href: "/games/poker/poker.html",
    badge: "HOT",
    badgeColor: "gold",
    isFree: true,
  },
  {
    id: "zecru-tower-defense",
    title: "Zecru Tower Defense",
    description:
      "Build towers, stop the horde! 5 unique towers, 3 powerful Ascended towers, and 30 waves of enemies. Co-op multiplayer supported.",
    thumbnail: "/games/zecru-tower-defense/thumbnail.png",
    href: "/games/zecru-tower-defense/index.html",
    badge: "NEW",
    badgeColor: "green",
    isFree: true,
  },
  {
    id: "zecru-15-clues",
    title: "Zecru 15 Clues",
    description:
      "One word. One chance. Can you crack the code? Give 1-word clues to help your partner guess 10 hidden words in 15 tries.",
    thumbnail: "/games/zecru-15-clues/thumbnail.svg",
    href: "/games/zecru-15-clues/index.html",
    badge: "NEW",
    badgeColor: "green",
    isFree: true,
  },
  {
    id: "zecru-wordmaster",
    title: "Zecru's WordMaster",
    description:
      "Give clues and guess words — but avoid the doom word! A Codenames-style 2-player word game with a 5x5 grid.",
    thumbnail: "/games/zecru-wordmaster/thumbnail.svg",
    href: "/games/zecru-wordmaster/index.html",
    badge: "NEW",
    badgeColor: "green",
    isFree: true,
  },
  {
    id: "realtyrush",
    title: "RealtyRush",
    description:
      "A strategic real estate board game for 2-6 players. Buy properties, collect rent, play cartel cards, and bankrupt your rivals.",
    thumbnail: "/games/realtyrush/thumbnail.svg",
    href: "/games/realtyrush/index.html",
    badge: "NEW",
    badgeColor: "green",
    isFree: true,
  },
  {
    id: "critter-colony",
    title: "Critter Colony",
    description:
      "Capture critters, build workstations, and automate your colony! AFK gains keep your critters working while you're away.",
    thumbnail: "https://d2f5lfipdzhi8t.cloudfront.net/critter-colony/thumbnail.webp",
    href: "/games/critter-colony/index.html",
    badge: "NEW",
    badgeColor: "green",
    isFree: false,
    price: 5,
  },
  {
    id: "kingdom-conquest",
    title: "Kingdom Conquest",
    description:
      "Medieval AFK tycoon meets card game. Build your kingdom, draw AI-generated cards, raid rivals, and conquer the world map.",
    thumbnail: "/games/kingdom-conquest/thumbnail.svg",
    href: "/kingdom-conquest",
    badge: "NEW",
    badgeColor: "gold",
    isFree: true,
  },
  {
    id: "imposter",
    title: "Who's The Imposter?",
    description:
      "One word. One liar. Play in person or online — everyone gets the word except the imposter, who only gets a hint. Find the faker!",
    thumbnail: "https://games.zecrugames.com/imposter/thumbnail.png",
    href: "https://games.zecrugames.com/imposter/",
    badge: "NEW",
    badgeColor: "gold",
    isFree: true,
  },
];

// Returns the games a user can actually play right now: free games +
// games in their purchased library + everything if admin/tester.
export function getOwnedGames(opts: {
  ownedIds: string[];
  isAdmin?: boolean;
  isTester?: boolean;
}): Game[] {
  const { ownedIds, isAdmin, isTester } = opts;
  return GAMES.filter((g) => g.isFree || isAdmin || isTester || ownedIds.includes(g.id));
}
