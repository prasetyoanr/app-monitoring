import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
