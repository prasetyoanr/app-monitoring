import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/system-health": ["./drizzle/**/*"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  experimental: {
    // The persistent Turbopack cache can pause Windows development while its
    // database is compacted. Keep Turbopack, but use its in-memory dev cache.
    turbopackFileSystemCacheForDev: false,
    serverActions: {
      // A compressed work photo is capped at 2 MiB; multipart fields need overhead.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
