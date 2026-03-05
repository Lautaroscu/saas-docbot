import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    ppr: true,
    clientSegmentCache: true,
  },
  serverExternalPackages: ['bullmq', 'ioredis'],
};

export default nextConfig;
