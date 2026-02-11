import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for serving from Express
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slashes for cleaner static file serving
  trailingSlash: true,

  // Limit workers to prevent OOM on Railway build
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;

