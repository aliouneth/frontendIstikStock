import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8080";

const nextConfig: NextConfig = {
  images: {
    // Next rejects query strings on local images unless localPatterns covers
    // them, and `search` is matched by exact string equality (no globbing).
    // Omitting `search` skips that check, which matches Next's own default of
    // allowing every local image — required for the versioned logo (?v=…).
    localPatterns: [{ pathname: "/**" }],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
