// can be safely removed after a while

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === '/dyMiMB') {
    const url = new URL('/HJSTkZ', request.url)
    // Return a redirect response
    return NextResponse.redirect(url)
  }
} 