/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Set global object to 'self' for web worker compatibility
    config.output.globalObject = 'self';
    return config;
  },
  // Disable image optimization during build to speed up builds
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
}

module.exports = nextConfig 