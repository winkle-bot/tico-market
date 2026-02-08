import type { NextConfig } from "next";

// Note: initOpenNextCloudflareForDev() requires macOS 13.5+
// Skipping for this build - local dev uses `next dev`, deployment works fine

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
