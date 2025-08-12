/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["next-mdx-remote"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    return config;
  },
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // default
              "default-src 'self'",

              // scripts (your own + Cloudflare challenge)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",

              // styles & fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",

              // images & media
              "img-src 'self' data: blob: https:",
              "media-src 'self' https:",

              // no plugins or embeds of other origins
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",

              // prevent others framing your page (but allow self for embeds)
              "frame-ancestors 'self'",

              // iframes you embed
              "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://privy.play.negationgame.com https://www.youtube.com",

              // AJAX, WebSocket, SIWE/API calls - more permissive in dev
              isDev 
                ? "connect-src 'self' https: wss: ws: http://localhost:* https://localhost:*"
                : "connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com",

              // service workers, web workers
              "worker-src 'self' blob:",

              // PWA manifest
              "manifest-src 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  },
};

export default nextConfig;
