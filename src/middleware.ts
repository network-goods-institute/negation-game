import { SPACE_HEADER, USER_HEADER } from "@/constants/config";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { VALID_SPACE_IDS } from "@/lib/negation-game/staticSpacesList";
import { getPrivyClient } from "@/lib/privy/getPrivyClient";
import { NextRequest, NextResponse } from "next/server";

// Special subdomains that shouldn't redirect to a space
const BLACKLISTED_SUBDOMAINS = new Set(["www", "api", "admin"]);

const SPACE_REWRITE_EXCLUSION_PREFIXES = ["/profile"] as const;

function isSpaceRewriteExcluded(pathname: string): boolean {
  return SPACE_REWRITE_EXCLUSION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const SENSITIVE_PATTERNS = [
  /\.env$/i, // Environment files
  /wp-login\.php$/i, // WordPress login attempts
  /wp-admin/i, // WordPress admin attempts
  /\.git/i, // Git repository files
  /\.htaccess$/i, // Apache config files
  /\.DS_Store$/i, // macOS system files
  /\.config$/i, // Config files
  /\.sql$/i, // SQL files
  /\/administrator\//i, // Joomla admin
  /\/phpmyadmin/i, // phpMyAdmin
  /\/filemanager/i, // File manager
  /\/config\./i, // Config files
  /\/passwd$/i, // Password files
  /\/setup\.php$/i, // Setup scripts
  /\/debug\.php$/i, // Debug scripts
  /\/installation\//i, // Installation directories
  /\/install\.(php|aspx)$/i, // Install scripts
];

export const config = {
  matcher: [
    "/",
    "/((?!_next/|_static/|img/|api/|_vercel|favicon\\.|.*\\.\\w+$).+)",
    "/.env",
    "/wp-login.php",
    "/.git/:path*",
  ],
};

function shouldHandlePath(pathname: string): boolean {
  return !(
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/img/") ||
    pathname.startsWith("/_static/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_vercel/") ||
    pathname === "/favicon.ico" ||
    /^\/[^\/]+\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

async function handleAuth(req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const token = req.cookies.get("privy-token")?.value;

  if (token) {
    try {
      const client = await getPrivyClient();
      const claims = await client.verifyAuthToken(token);
      response.headers.set(USER_HEADER, JSON.stringify(claims));
    } catch (error: any) {
      if (error.name !== "JWTExpired") {
        console.error("Error verifying Privy auth token:", error);
      }
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      response.cookies.delete("privy-token");
    }
  }

  return response;
}

function handleSubdomain(
  req: NextRequest,
  subdomain: string
): NextResponse | undefined {
  const url = req.nextUrl;

  // Replace "viewpoint" path segments with "rationale" (segment-safe)
  const replaceViewpointSegments = (pathname: string): string => {
    const parts = pathname.split("/");
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "viewpoint") parts[i] = "rationale";
    }
    return parts.join("/");
  };

  // Handle sync subdomain - rewrites to multiplayer rationale
  if (subdomain === "sync") {
    const path = url.pathname;
    if (path === "/" || path === "") {
      const dest = new URL("/experiment/rationale/multiplayer", req.url);
      url.searchParams.forEach((value, key) => {
        dest.searchParams.set(key, value);
      });
      return NextResponse.rewrite(dest);
    }
    const boardMatch = path.match(/^\/board\/([^/]+)\/?$/);
    if (boardMatch) {
      const idOrSlug = boardMatch[1];
      const dest = new URL(
        `/experiment/rationale/multiplayer/${encodeURIComponent(idOrSlug)}`,
        req.url
      );
      url.searchParams.forEach((value, key) => {
        dest.searchParams.set(key, value);
      });
      return NextResponse.rewrite(dest);
    }
    return NextResponse.next();
  }

  // Handle play subdomain - shows the old landing page and app behavior
  if (subdomain === "play") {
    const pathname = url.pathname;
    const parts = pathname.split("/");
    const hasViewpointSegment = parts.some((seg) => seg === "viewpoint");
    if (hasViewpointSegment) {
      const newPathname = parts
        .map((seg) => (seg === "viewpoint" ? "rationale" : seg))
        .join("/");
      const newUrl = new URL(newPathname, req.url);
      url.searchParams.forEach((value, key) => {
        newUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(newUrl, 307);
    }
    return NextResponse.next();
  }

  // Handle scroll subdomain - redirects to scroll space
  if (subdomain === "scroll") {
    const path = url.pathname;
    let targetPath = path;

    // If path already has /s/[space], strip it and use just the rest
    if (targetPath.startsWith("/s/")) {
      const pathParts = targetPath.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        pathParts.splice(0, 2); // Remove "s" and the space name
        targetPath = pathParts.length > 0 ? `/${pathParts.join("/")}` : "";
      }
    }

    if (isSpaceRewriteExcluded(targetPath)) {
      const response = NextResponse.next();
      response.headers.set(SPACE_HEADER, "scroll");
      return response;
    }

    // For root path, rewrite to scroll space
    if (targetPath === "/" || targetPath === "") {
      const dest = new URL("/s/scroll", req.url);
      url.searchParams.forEach((value, key) => {
        dest.searchParams.set(key, value);
      });
      const response = NextResponse.rewrite(dest);
      response.headers.set(SPACE_HEADER, "scroll");
      return response;
    }

    // For all other paths, prepend /s/scroll
    const dest = new URL(`/s/scroll${targetPath}`, req.url);
    url.searchParams.forEach((value, key) => {
      dest.searchParams.set(key, value);
    });
    const response = NextResponse.rewrite(dest);
    response.headers.set(SPACE_HEADER, "scroll");
    return response;
  }

  if (BLACKLISTED_SUBDOMAINS.has(subdomain)) {
    const redirectUrl = new URL(`https://negationgame.com${url.pathname}`);
    url.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(redirectUrl, 307);
  }

  if (VALID_SPACE_IDS.has(subdomain)) {
    let targetPath = url.pathname;
    if (targetPath.startsWith("/s/")) {
      const pathParts = targetPath.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        pathParts.splice(0, 2);
        targetPath = pathParts.length > 0 ? `/${pathParts.join("/")}` : "";
      }
    }

    if (isSpaceRewriteExcluded(targetPath)) {
      const response = NextResponse.next();
      response.headers.set(SPACE_HEADER, subdomain);
      return response;
    }

    const dest = new URL(`/s/${subdomain}${targetPath}`, req.url);
    url.searchParams.forEach((value, key) => {
      dest.searchParams.set(key, value);
    });

    const response = NextResponse.rewrite(dest);
    response.headers.set(SPACE_HEADER, subdomain);
    return response;
  }

  return NextResponse.next();
}

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    console.error(`Blocked attempt to access sensitive path: ${pathname}`);
    const response = new NextResponse(null, {
      status: 404,
      statusText: "Not Found",
    });
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  if (!shouldHandlePath(pathname)) {
    return NextResponse.next();
  }

  if (url.pathname.startsWith("/embed/")) {
    const response = NextResponse.next();
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    response.headers.delete("X-Frame-Options");
    const isDev = process.env.NODE_ENV !== "production";
    const embedAncestors = [
      "https://forum.scroll.io",
      "https://negationgame.com",
      "https://play.negationgame.com",
      "https://scroll.negationgame.com",
      "https://*.negationgame.com",
      "https://negation-game-git-fork-swaggymar-fb888c-network-goods-institute.vercel.app",
      "https://negation-game-git-mindchange-network-goods-institute.vercel.app",
      ...(isDev
        ? [
            "http://localhost:*",
            "https://localhost:*",
            "http://127.0.0.1:*",
            "https://127.0.0.1:*",
          ]
        : []),
    ].join(" ");
    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors ${embedAncestors}; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.tldraw.com; img-src 'self' data: blob: https: https://cdn.tldraw.com; connect-src 'self' https://auth.privy.io https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com https://privy.negationgame.com https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-analytics.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://cdn.tldraw.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org;`
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("x-pathname", url.pathname);
    return response;
  }

  const embedParam = url.searchParams.get("embed");
  if (
    embedParam === "mobile" ||
    embedParam === "embed" ||
    embedParam === "desktop"
  ) {
    // Treat as an embed route: allow in iframe and hide main header
    const response = NextResponse.next();
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    response.headers.delete("X-Frame-Options");
    const isDev2 = process.env.NODE_ENV !== "production";
    const embedAncestors2 = [
      "https://forum.scroll.io",
      "https://negationgame.com",
      "https://play.negationgame.com",
      "https://scroll.negationgame.com",
      "https://*.negationgame.com",
      "https://negation-game-git-fork-swaggymar-fb888c-network-goods-institute.vercel.app",
      "https://negation-game-git-mindchange-network-goods-institute.vercel.app",
      ...(isDev2
        ? [
            "http://localhost:*",
            "https://localhost:*",
            "http://127.0.0.1:*",
            "https://127.0.0.1:*",
          ]
        : []),
    ].join(" ");
    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors ${embedAncestors2}; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.tldraw.com; img-src 'self' data: blob: https: https://cdn.tldraw.com; connect-src 'self' https://auth.privy.io https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com https://privy.negationgame.com https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-analytics.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://cdn.tldraw.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org;`
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Prefix with /embed so root layout hides header
    response.headers.set("x-pathname", `/embed${url.pathname}`);

    // If the path includes a space segment, pass it along so views/data still work
    const space = getSpaceFromPathname(url.pathname);
    if (space) {
      response.headers.set(SPACE_HEADER, space);
    } else {
      // Default embed routes to scroll space
      response.headers.set(SPACE_HEADER, "scroll");
    }

    return response;
  }

  const authResponse = await handleAuth(req);

  const hostHeader = req.headers.get("host") || "";
  const hostNoPort = hostHeader.split(":")[0];
  const domainMatch = hostNoPort.match(/^([^.]+)\.negationgame\.com$/i);

  if (domainMatch) {
    const subdomain = domainMatch[1].toLowerCase();
    const subdomainResponse = handleSubdomain(req, subdomain);
    if (subdomainResponse) {
      // Forward headers from authResponse
      authResponse.headers.forEach((value, key) => {
        subdomainResponse.headers.set(key, value);
      });
      return subdomainResponse;
    }
  }

  // Root domain redirects for /play/* and /scroll/*
  if (pathname.startsWith("/play/") || pathname === "/play") {
    const restOfPath = pathname.slice(5); // Remove "/play"
    const redirectUrl = new URL(
      `https://play.negationgame.com${restOfPath}`,
      req.url
    );
    url.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(redirectUrl, 307);
  }

  if (pathname.startsWith("/scroll/") || pathname === "/scroll") {
    const restOfPath = pathname.slice(7); // Remove "/scroll"
    const redirectUrl = new URL(
      `https://scroll.negationgame.com${restOfPath}`,
      req.url
    );
    url.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(redirectUrl, 307);
  }

  // Handle /board/:id routes on root domain (rewrite to multiplayer rationale)
  const boardMatch = pathname.match(/^\/board\/([^/]+)\/?$/);
  if (boardMatch) {
    const idOrSlug = boardMatch[1];
    const dest = new URL(
      `/experiment/rationale/multiplayer/${encodeURIComponent(idOrSlug)}`,
      req.url
    );
    url.searchParams.forEach((value, key) => {
      dest.searchParams.set(key, value);
    });
    const rewriteResponse = NextResponse.rewrite(dest);
    authResponse.headers.forEach((value, key) => {
      rewriteResponse.headers.set(key, value);
    });
    return rewriteResponse;
  }

  // Root path on main domain now shows multiplayer rationale
  if (pathname === "/") {
    const dest = new URL("/experiment/rationale/multiplayer", req.url);
    url.searchParams.forEach((value, key) => {
      dest.searchParams.set(key, value);
    });
    const rewriteResponse = NextResponse.rewrite(dest);
    authResponse.headers.forEach((value, key) => {
      rewriteResponse.headers.set(key, value);
    });
    return rewriteResponse;
  }

  const parts = pathname.split("/");
  let hasViewpointSegment = false;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "viewpoint") {
      parts[i] = "rationale";
      hasViewpointSegment = true;
    }
  }

  if (hasViewpointSegment) {
    const newPathname = parts.join("/");
    const newUrl = new URL(newPathname, req.url);
    url.searchParams.forEach((value, key) => {
      newUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(newUrl, 307);
  }

  // Redirect /s/* paths to play.negationgame.com on root domain
  if (pathname.startsWith("/s/")) {
    const redirectUrl = new URL(
      `https://play.negationgame.com${pathname}`,
      req.url
    );
    url.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(redirectUrl, 307);
  }

  // Allow only specific paths on root domain
  // Everything else redirects to play.negationgame.com
  const allowedRootPaths = ["/experiment"];
  const isAllowedOnRoot = allowedRootPaths.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isAllowedOnRoot) {
    authResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return authResponse;
  }

  // Redirect remaining paths to play.negationgame.com (old default behavior)
  const redirectUrl = new URL(
    `https://play.negationgame.com${pathname}`,
    req.url
  );
  url.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });
  return NextResponse.redirect(redirectUrl, 307);
}
