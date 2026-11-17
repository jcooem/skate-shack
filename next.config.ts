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
  async headers() {
    return [
      {
        // Private card links: keep the secret URL out of Referer headers,
        // shared caches and search engines.
        source: "/card/:token",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Logo uploads go through a Server Action (logo itself is capped at 1 MB).
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
