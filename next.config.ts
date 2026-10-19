import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'radix-ui'],
  },
  webpack: (config: any, { nextRuntime }: any) => {
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        'ua-parser-js': path.resolve('./stubs/empty-module.js'),
      };
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      'ua-parser-js': './stubs/empty-module.js',
    },
  },
} as any;

export default nextConfig;
