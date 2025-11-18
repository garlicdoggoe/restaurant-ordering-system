import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * NOTE: Temporarily disable ESLint and TypeScript build blocking on Vercel
   * so we can deploy while we fix lint/type issues incrementally.
   * These settings should be revisited and tightened once errors are resolved.
   */
  eslint: {
    // Do not block production builds due to ESLint errors
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Do not block production builds on type errors
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
        pathname: "/api/storage/**",
      },
      // Also allow the specific hostname if env var is available (with error handling)
      ...(process.env.NEXT_PUBLIC_CONVEX_URL
        ? (() => {
            try {
              const url = new URL(process.env.NEXT_PUBLIC_CONVEX_URL);
              return [
                {
                  protocol: "https" as const,
                  hostname: url.hostname,
                  pathname: "/api/storage/**",
                },
              ];
            } catch {
              return [];
            }
          })()
        : []),
    ],
  },
};

export default nextConfig;
