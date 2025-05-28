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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: blob: https:; " +
              "media-src 'self' https:; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "frame-ancestors 'none'; " +
              "child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org; " +
              "frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://www.loom.com; " +
              "connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org; " +
              "worker-src 'self' blob:; " +
              "manifest-src 'self'",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 