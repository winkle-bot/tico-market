import type { NextConfig } from "next";

// Note: initOpenNextCloudflareForDev() requires macOS 13.5+
// Skipping for this build - local dev uses `next dev`, deployment works fine

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

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
      ...(supabaseHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHostname,
              pathname: '/storage/v1/object/**',
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
