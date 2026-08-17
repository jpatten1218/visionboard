import type { NextConfig } from "next";

// Phone photos are several megabytes. Routing them through the image
// optimiser is the difference between a board that loads on cellular and one
// that doesn't, so the Supabase storage host has to be allow-listed.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/sign/**" }]
      : [],
  },
};

export default nextConfig;
