import Link from "next/link";

interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  href: string;
  badge?: string;
  badgeColor?: "gold" | "green";
  isFree?: boolean;
}

export function GameCard({ game }: { game: Game }) {
  const badgeStyles = {
    gold: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    green: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  };

  return (
    <Link 
      href={game.href}
      className="group bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-[rgb(0,212,170)] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/50 block"
    >
      <div className="h-40 relative overflow-hidden">
        <img 
          src={game.thumbnail} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {game.isFree && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded">
            FREE
          </span>
        )}
      </div>
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">{game.title}</h3>
          {game.badge && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${badgeStyles[game.badgeColor || "gold"]}`}>
              {game.badge}
            </span>
          )}
        </div>
        
        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
          {game.description}
        </p>
        
        <span className="block w-full py-3 bg-[rgb(0,212,170)] group-hover:bg-[rgb(0,180,145)] text-slate-900 text-center rounded-lg font-bold transition-colors">
          Play Now
        </span>
      </div>
    </Link>
  );
}

