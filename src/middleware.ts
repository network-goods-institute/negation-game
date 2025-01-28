import { DEFAULT_SPACE, SPACE_HEADER } from "@/constants/config";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { spaceBasePath } from "@/lib/negation-game/spaceBasePath";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|img/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Allow direct access to /profile without redirection
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
