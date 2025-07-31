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

  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/delta")
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
