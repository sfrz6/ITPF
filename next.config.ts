import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  // A self-contained server bundle for the Docker image, so the production
  // container only needs the built output and a minimal `node_modules`
  // rather than the whole dev dependency tree. Vercel ignores this (it has
  // its own build pipeline), so it's safe for both deployment targets.
  output: "standalone",
  experimental: {
    // Creating a championship can carry two base64-encoded logo images
    // (up to 2 MB raw each) alongside the rest of the form, well past the
    // 1 MB default for a Server Action's request body.
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
