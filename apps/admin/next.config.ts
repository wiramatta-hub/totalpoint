import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "profile.line-scdn.net" },
      { protocol: "https", hostname: "*.cloudfront.net" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      // Add your custom R2/CDN domain here:
      // { protocol: "https", hostname: "cdn.your-domain.com" },
    ],
  },
  env: {
    LIFF_URL: process.env.LIFF_URL || "http://localhost:3001",
  },
};

export default nextConfig;
