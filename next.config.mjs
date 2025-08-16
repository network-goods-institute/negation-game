/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
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
    const scriptSrc = [
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      isDev ? "'unsafe-eval'" : null,
    ].filter(Boolean).join(' ');

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://privy.play.negationgame.com https://www.youtube.com",
      "connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');

    const commonSecurityHeaders = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Prefer CSP frame-ancestors over legacy X-Frame-Options to allow scoped embedding
      { key: 'Permissions-Policy', value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      { key: 'Origin-Agent-Cluster', value: '?1' },
    ];

    const prodOnlyHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];

    // Embed pages need to be framable by allowlisted origins only
    const embedAllowedAncestors = [
      "https://forum.scroll.io",
      "https://negationgame.com",
      "https://play.negationgame.com",
      "https://scroll.negationgame.com",
      "https://*.negationgame.com",
    ].join(' ');

    const cspEmbed = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors ${embedAllowedAncestors}`,
      "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://privy.play.negationgame.com https://www.youtube.com",
      "connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');

    const embedHeaders = [
      { key: 'Content-Security-Policy', value: cspEmbed },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      { key: 'Origin-Agent-Cluster', value: '?1' },
    ];

    return [
      {
        source: '/embed/:path*',
        headers: isDev ? embedHeaders : [...embedHeaders, ...prodOnlyHeaders],
      },
      {
        source: '/:path*',
        headers: isDev ? commonSecurityHeaders : [...commonSecurityHeaders, ...prodOnlyHeaders],
      }
    ];
  },
};

export default nextConfig;
