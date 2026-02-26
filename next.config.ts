import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // Suppress Turbopack + Webpack config warning for Next 16
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
