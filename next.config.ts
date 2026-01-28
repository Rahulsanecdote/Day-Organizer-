import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set project root to prevent Next.js from detecting parent lockfiles
  turbopack: {
    root: '.',
  },
};

export default nextConfig;
