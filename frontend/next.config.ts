import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "",
  output: "standalone",
  poweredByHeader: false,
  // Accept request paths without automatic trailing-slash redirects.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Accel-Buffering", value: "no" },
        ],
      },
    ];
  },
  async rewrites() {
    // Production routes /api directly to Rust at the gateway.
    if (process.env.NODE_ENV !== "development") return [];
    const origin = process.env.GGST_API_INTERNAL_URL ?? "http://127.0.0.1:8001";
    return [
      {
        source: "/api/:path*",
        destination: `${origin.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
