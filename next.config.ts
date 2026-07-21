import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A compressed work photo is capped at 2 MiB; multipart fields need overhead.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
