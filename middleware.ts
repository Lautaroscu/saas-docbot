import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { apiKeys, teamMembers, teams, memberDepartments, departments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Cache Global
const apiKeyCache = new Map<string, { teamId: number; departmentId: number | null; expires: number }>();
const subscriptionCache = new Map<number, { status: string; expires: number }>();
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
    let departmentId: number | null = null;
    const cached = apiKeyCache.get(apiKey);

    if (cached && cached.expires > Date.now()) {
      teamId = cached.teamId;
      departmentId = cached.departmentId;
    } else {
      const keyData = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.apiKey, apiKey),
      });

      if (keyData && keyData.isActive) {
        teamId = keyData.teamId;
        departmentId = keyData.departmentId;
        apiKeyCache.set(apiKey, {
          teamId: keyData.teamId,
          departmentId: keyData.departmentId,
          expires: Date.now() + CACHE_TTL
        });
      }
    }

    if (!teamId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid or inactive API key' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-team-id', teamId.toString());
    if (departmentId) {
      requestHeaders.set('x-department-id', departmentId.toString());
    }

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

      // Check Subscription specific rules exclusively for protected routes
      if (isProtectedRoute) {
        let subStatus: string | null = null;
        const cached = subscriptionCache.get(parsed.user.id);

        if (cached && cached.expires > Date.now()) {
          subStatus = cached.status;
        } else {
          const memberResult = await db.select({
            subscriptionStatus: teams.subscriptionStatus
          }).from(teamMembers)
            .innerJoin(teams, eq(teamMembers.teamId, teams.id))
            .where(eq(teamMembers.userId, parsed.user.id))
            .limit(1);

          if (memberResult.length > 0) {
            subStatus = memberResult[0].subscriptionStatus || 'inactive';
            subscriptionCache.set(parsed.user.id, {
              status: subStatus,
              expires: Date.now() + CACHE_TTL
            });
          }
        }

        // Permitir el acceso a la configuración para gestionar pagos, bloqueando el resto
        const isSettingsRoute = pathname.startsWith('/settings') || pathname.startsWith('/dashboard/settings');

        if (!subStatus || (subStatus !== 'active' && subStatus !== 'authorized')) {
          if (!isSettingsRoute) {
            return NextResponse.redirect(new URL('/pricing', request.url));
          }
        }

        // Context Persistence: Validar si no tiene un departamento seleccionado
        const isScopedRoute = pathname.startsWith('/management') || pathname.startsWith('/agenda') || pathname.startsWith('/patients');
        const departmentCookie = request.cookies.get('medly_department_id');

        if (isScopedRoute && !departmentCookie && subStatus === 'active') {
          // Traer la pertenencia completa
          const memberData = await db.query.teamMembers.findFirst({
            where: eq(teamMembers.userId, parsed.user.id),
            with: {
              memberDepartments: {
                with: {
                  department: true
                }
              }
            }
          });

          if (memberData) {
            if (memberData.role === 'SUPER_ADMIN') {
              // Al super_admin le asignamos la vista global "all" si no tiene cookie
              res.cookies.set('medly_department_id', 'all', { path: '/' });
            } else if (memberData.memberDepartments.length > 0) {
              // A los ADMIN y DOCTOR los forzamos a su primera área autorizada
              res.cookies.set('medly_department_id', memberData.memberDepartments[0].departmentId.toString(), { path: '/' });
            } else {
              // Si no es super admin y no tiene áreas... no debería estar aquí, lo devolvemos a config
              return NextResponse.redirect(new URL('/settings', request.url));
            }
          }
        }
      }

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
