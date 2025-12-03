// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // For DirectAdmin / standalone deployment
  output: "standalone",

  // React Compiler (Next 16)
  reactCompiler: true,

  // Remote image domains allowed
  images: {
    remotePatterns: [
      // Unsplash (homepage fallback photos)
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },

      // Supabase storage URLs
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
