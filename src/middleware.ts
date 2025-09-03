import { SPACE_HEADER, USER_HEADER } from "@/constants/config";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { isValidSpaceId } from "@/lib/negation-game/isValidSpaceId";
import { VALID_SPACE_IDS } from "@/lib/negation-game/staticSpacesList";
import { getPrivyClient } from "@/lib/privy/getPrivyClient";
import { NextRequest, NextResponse } from "next/server";

// Special subdomains that shouldn't redirect to a space
const BLACKLISTED_SUBDOMAINS = new Set(["www", "api", "play", "admin"]);

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
    {
      source: "/(.*)",
      has: [{ type: "host", value: "(.+)" }],
    },
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

  if (BLACKLISTED_SUBDOMAINS.has(subdomain) || !isValidSpaceId(subdomain)) {
    if (subdomain === "play") {
      return undefined;
    }
    return NextResponse.redirect(new URL("https://negationgame.com"));
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

    const spaceUrl = new URL(
      `/s/${subdomain}${targetPath}`,
      "https://play.negationgame.com"
    );
    url.searchParams.forEach((value, key) => {
      spaceUrl.searchParams.set(key, value);
    });

    const response = NextResponse.redirect(spaceUrl);
    response.headers.set(SPACE_HEADER, subdomain);
    return response;
  }

  return NextResponse.redirect(new URL("https://negationgame.com"));
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
      `frame-ancestors ${embedAncestors}; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.tldraw.com; img-src 'self' data: blob: https: https://cdn.tldraw.com; connect-src 'self' https://auth.privy.io https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com https://vitals.vercel-insights.com https://cdn.tldraw.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org;`
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
      `frame-ancestors ${embedAncestors2}; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://auth.privy.io https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com https://vitals.vercel-insights.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org;`
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

  const host = req.headers.get("host") || "";
  const domainMatch = host.match(/^([^.]+)\.negationgame\.com$/i);

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

  if (pathname === "/") {
    return authResponse;
  }

  if (pathname.includes("viewpoint")) {
    const newPathname = pathname.replace(/viewpoint/g, "rationale");
    const newUrl = new URL(newPathname, req.url);
    url.searchParams.forEach((value, key) => {
      newUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(newUrl);
  }

  if (pathname.startsWith("/s/")) {
    const space = getSpaceFromPathname(pathname);
    if (!space) {
      return; // malformed /s/ path
    }
    authResponse.headers.set(SPACE_HEADER, space);
    return authResponse;
  }

  // Handle profile paths without rewriting
  if (url.pathname.startsWith("/profile")) {
    return NextResponse.next();
  }

  // Handle settings, notifications, messages, admin, delta, experiment, and embed paths without rewriting
  if (
    url.pathname.startsWith("/settings") ||
    url.pathname.startsWith("/notifications") ||
    url.pathname.startsWith("/messages") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/delta") ||
    url.pathname.startsWith("/experiment") ||
    url.pathname.startsWith("/embed")
  ) {
    if (!pathname.startsWith("/s/")) {
      authResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return authResponse;
  }

  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    const redirectUrl = new URL(`/s/global${pathname}`, req.url);
    url.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(redirectUrl);
  }

  const rewriteUrl = new URL(`/s/global${pathname}`, req.url);
  url.searchParams.forEach((value, key) => {
    rewriteUrl.searchParams.set(key, value);
  });

  const rewriteResponse = NextResponse.rewrite(rewriteUrl);
  // Forward headers from authResponse
  authResponse.headers.forEach((value, key) => {
    rewriteResponse.headers.set(key, value);
  });

  return rewriteResponse;
}
