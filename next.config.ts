import type { NextConfig } from "next";

// This app is almost entirely per-user and database driven, so it uses the
// default request-time rendering model instead of Cache Components.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["pg"],
  experimental: {
    serverActions: {
      // Logo uploads go through a Server Action (logo itself is capped at 1 MB).
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
