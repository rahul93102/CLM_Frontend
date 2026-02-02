import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Keep config minimal; Turbopack has been unstable in this repo.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
