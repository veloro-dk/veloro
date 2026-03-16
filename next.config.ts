import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep dev and production build artifacts separated to avoid stale module-factory
    // runtime errors when switching between `next dev` and `next build`.
    isolatedDevBuild: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "purecatamphetamine.github.io",
        pathname: "/country-flag-icons/**",
      },
    ],
  },
};

export default nextConfig;
