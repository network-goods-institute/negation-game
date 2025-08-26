import path from 'path';
import { fileURLToPath } from 'url';
/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
const nextConfig = {
  transpilePackages: ["next-mdx-remote"],
  // Avoid bundling multiple copies of yjs in server builds (Next 15+)
  serverExternalPackages: ["yjs", "y-websocket"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    // Force a single yjs implementation on the server to prevent double-import warnings
    if (isServer) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const yjsCjsPath = path.resolve(__dirname, 'node_modules/yjs/dist/yjs.cjs');
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['yjs'] = yjsCjsPath;
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

    const yjsWsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL;
    let yjsWsOrigin = null;
    try {
      yjsWsOrigin = yjsWsUrl ? new URL(yjsWsUrl).origin : null;
    } catch {}

    const connectSrc = [
      "connect-src 'self'",
      "https://auth.privy.io",
      "wss://relay.walletconnect.com",
      "wss://relay.walletconnect.org",
      "wss://www.walletlink.org",
      "https://*.rpc.privy.systems",
      "https://explorer-api.walletconnect.com",
      "https://api.web3modal.org",
      "https://pulse.walletconnect.org",
      "https://privy.play.negationgame.com",
      yjsWsOrigin,
      isDev ? "ws://localhost:8080" : null,
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
      "frame-ancestors 'self' https://negation-game-git-auth-refactor-staging-network-goods-institute.vercel.app https://negation-game-network-goods-institute.vercel.app https://negation-game-git-fork-swaggymar-fb888c-network-goods-institute.vercel.app https://auth.privy.io",
      "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://privy.play.negationgame.com https://www.youtube.com",
      connectSrc,
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
    const embedAllowedAncestorsArr = [
      "https://forum.scroll.io",
      "https://negationgame.com",
      "https://play.negationgame.com",
      "https://scroll.negationgame.com",
      "https://*.negationgame.com",
      "https://negation-game-git-fork-swaggymar-fb888c-network-goods-institute.vercel.app",
    ];
    if (isDev) {
      embedAllowedAncestorsArr.push(
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1:*",
        "https://127.0.0.1:*",
      );
    }
    const embedAllowedAncestors = embedAllowedAncestorsArr.join(' ');

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
      connectSrc,
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
