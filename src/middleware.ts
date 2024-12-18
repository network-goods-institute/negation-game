import { DEFAULT_SPACE, SPACE_HEADER } from "@/constants/config";
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

  if (!url.pathname.startsWith("/s/")) {
    const space = DEFAULT_SPACE;

    const response = NextResponse.rewrite(
      new URL(`/s/global${url.pathname}`, req.url)
    );
    response.headers.set(SPACE_HEADER, space);
    return response;
  }

  const match = url.pathname.match(/^\/s\/([^/]+)/);
  const space = match ? match[1] : null;

  // let it 404
  if (!space) return;

  const response = NextResponse.next();
  response.headers.set(SPACE_HEADER, space);
  return response;
}
