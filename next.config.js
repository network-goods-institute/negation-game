/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Only set globalObject to 'self' for client-side builds
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    return config;
  },
  // Disable image optimization during build to speed up builds
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
}

module.exports = nextConfig 