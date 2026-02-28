import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { apiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Cache Global
const apiKeyCache = new Map<string, { teamId: number; expires: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutos

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoutes = ['/sign-in', '/sign-up', '/pricing', '/api/webhooks', '/_next'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isProtectedRoute = !isPublicRoute && !pathname.startsWith('/api');

  // Only external bot endpoints require API Key. Dashboard endpoints use cookies.
  const isBotApiRoute = pathname.startsWith('/api/chat') || pathname.startsWith('/api/doctors');

  // --- 1. API KEY AUTH ---
  if (isBotApiRoute) {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing x-api-key header' }, { status: 401 });
    }

    let teamId: number | null = null;
    const cached = apiKeyCache.get(apiKey);

    if (cached && cached.expires > Date.now()) {
      teamId = cached.teamId;
    } else {
      const keyData = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.apiKey, apiKey),
      });

      if (keyData && keyData.isActive) {
        teamId = keyData.teamId;
        apiKeyCache.set(apiKey, {
          teamId: keyData.teamId,
          expires: Date.now() + CACHE_TTL
        });
      }
    }

    if (!teamId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid or inactive API key' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-team-id', teamId.toString());

    // Create new response with injected headers
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- 2. SESSION AUTH ---
  const sessionCookie = request.cookies.get('session');

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  let res = NextResponse.next();

  if (sessionCookie && request.method === 'GET') {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: expiresInOneDay
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};
