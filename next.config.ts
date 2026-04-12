import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Explicitly set project root to prevent Next.js from detecting parent lockfiles
  turbopack: {
    root: '.',
  },
};

export default withBundleAnalyzer(nextConfig);
