import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving static files from parent games folder
  async rewrites() {
    return [
      {
        source: '/games/:path*',
        destination: '/games/:path*',
      },
    ];
  },
};

export default nextConfig;

