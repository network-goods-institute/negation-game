import { DEFAULT_SPACE, SPACE_HEADER } from "@/constants/config";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { isValidSpaceId } from "@/lib/negation-game/isValidSpaceId";
import { spaceBasePath } from "@/lib/negation-game/spaceBasePath";
import { VALID_SPACE_IDS } from "@/lib/negation-game/staticSpacesList";
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
    // Only run the middleware on these specific paths
    // This is more reliable than trying to exclude specific paths
    "/",
    "/((?!_next/|_static/|img/|api/|_vercel|favicon\\.|.*\\.\\w+$).+)",

    // Add a hostname-based matcher to catch all hosts
    {
      source: "/(.*)",
      has: [
        {
          type: "host",
          value: "(.+)",
        },
      ],
    },
  ],
};

// Function to check if path should be handled by the middleware
function shouldHandlePath(pathname: string): boolean {
  // Skip static assets and API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/img/") ||
    pathname.startsWith("/_static/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_vercel/") ||
    pathname === "/favicon.ico" ||
    // Skip files with extensions in the root
    /^\/[^\/]+\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return false;
  }

  return true;
}

// Function to handle subdomain routing logic
function handleSubdomain(
  req: NextRequest,
  subdomain: string
): NextResponse | undefined {
  const url = req.nextUrl;

  // Skip middleware for static assets
  if (!shouldHandlePath(url.pathname)) {
    return NextResponse.next();
  }

  // Skip blacklisted subdomains
  if (BLACKLISTED_SUBDOMAINS.has(subdomain) || !isValidSpaceId(subdomain)) {
    // Special handling: if it's play.negationgame.com, allow rewrite to happen
    if (subdomain === "play") {
      // Instead of returning early, let the middleware continue to rewrite to /s/global
      return undefined;
    }

    // For other invalid subdomains, redirect to the main site
    return NextResponse.redirect(new URL("https://negationgame.com"));
  }

  // Check if the subdomain is a valid space using static list
  if (VALID_SPACE_IDS.has(subdomain)) {
    // Redirect to the space page on play subdomain
    const targetPath = url.pathname === "/" ? "" : url.pathname;
    const spaceUrl = new URL(
      `/s/${subdomain}${targetPath}`,
      "https://play.negationgame.com"
    );

    // Preserve query parameters
    for (const [key, value] of url.searchParams.entries()) {
      spaceUrl.searchParams.set(key, value);
    }

    const response = NextResponse.redirect(spaceUrl);
    response.headers.set(SPACE_HEADER, subdomain);
    return response;
  } else {
    // If it's not a valid space, redirect to the main site
    return NextResponse.redirect(new URL("https://negationgame.com"));
  }
}

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    console.error(`Blocked attempt to access sensitive path: ${pathname}`);

    return new NextResponse(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  // Skip middleware for static assets
  if (!shouldHandlePath(url.pathname)) {
    return NextResponse.next();
  }

  const host = req.headers.get("host") || "";

  // Check if we're dealing with a subdomain of negationgame.com
  const domainMatch = host.match(/^([^.]+)\.negationgame\.com$/i);
  if (domainMatch) {
    const subdomain = domainMatch[1].toLowerCase();
    const response = handleSubdomain(req, subdomain);
    if (response) return response;
  }

  // Replace 'viewpoint' with 'rationale' in the URL
  if (url.pathname.includes("viewpoint")) {
    const newPathname = url.pathname.replace(/viewpoint/g, "rationale");
    const newUrl = new URL(newPathname, req.url);

    // Preserve query parameters
    for (const [key, value] of url.searchParams.entries()) {
      newUrl.searchParams.set(key, value);
    }

    const response = NextResponse.redirect(newUrl);
    return response;
  }

  // Handle profile routes with /profile/username format
  if (url.pathname.startsWith("/profile/")) {
    const response = NextResponse.next();
    response.headers.set(SPACE_HEADER, DEFAULT_SPACE);
    return response;
  }

  // Legacy /profile route - just set header and let the page handle redirect
  if (url.pathname === "/profile") {
    const response = NextResponse.next();
    response.headers.set(SPACE_HEADER, DEFAULT_SPACE);
    return response;
  }

  if (!url.pathname.startsWith("/s/")) {
    const space = DEFAULT_SPACE;

    const response = NextResponse.rewrite(
      new URL(`/s/global${url.pathname}`, req.url)
    );
    response.headers.set(SPACE_HEADER, space);
    return response;
  }

  const space = getSpaceFromPathname(url.pathname);

  // let it 404 if it's a malformed url
  if (!space) return;

  const response =
    space === DEFAULT_SPACE
      ? NextResponse.redirect(
          new URL(url.origin + url.pathname.replace(spaceBasePath(space), ""))
        )
      : NextResponse.next();
  response.headers.set(SPACE_HEADER, space);
  return response;
}
