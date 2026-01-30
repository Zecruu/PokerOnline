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
  return (
    <Link
      href={game.href}
      className="group card-glass overflow-hidden block"
    >
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(20,20,30)] via-transparent to-transparent opacity-60" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {game.isFree && (
            <span className="badge badge-free">FREE</span>
          )}
        </div>

        {game.badge && (
          <div className="absolute top-4 right-4">
            <span className={`badge ${game.badgeColor === 'green' ? 'badge-featured' : 'badge-hot'}`}>
              {game.badge}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[rgb(0,212,170)] transition-colors">
          {game.title}
        </h3>

        <p className="text-white/50 text-sm mb-5 line-clamp-2 leading-relaxed">
          {game.description}
        </p>

        {/* Play Button */}
        <div className="relative">
          <div className="btn-glass btn-glass-primary w-full justify-center group-hover:shadow-lg group-hover:shadow-[rgba(0,212,170,0.2)]">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Play Now
          </div>
        </div>
      </div>
    </Link>
  );
}

