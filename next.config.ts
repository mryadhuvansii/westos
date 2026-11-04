import type { NextConfig } from 'next';
const config: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
