import { verifyToken } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { teamMembers, memberDepartments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

/**
 * Helper para validar la sesión actual desde las rutas de API (/api) y
 * recuperar tanto el usuario, su teamId activo y la lista de
 * departamentos a los que su Rol le da acceso.
 */
export async function getSessionContext(request: Request) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
        return { error: 'Unauthorized', status: 401 };
    }

    try {
        const parsed = await verifyToken(sessionCookie.value);
        if (!parsed || !parsed.user) {
            return { error: 'Invalid Session', status: 401 };
        }

        let teamIdStr = request.headers.get('x-team-id');
        let teamId: number;

        if (!teamIdStr) {
            // Frontend UI requests don't have x-team-id headers generally
            const userTeam = await getTeamForUser();
            if (!userTeam) return { error: 'Team not found for user', status: 403 };
            teamId = userTeam.id;
        } else {
            teamId = parseInt(teamIdStr, 10);
        }

        // Fetch User's Role within this Team
        const membership = await db.query.teamMembers.findFirst({
            where: and(eq(teamMembers.userId, parsed.user.id), eq(teamMembers.teamId, teamId)),
            with: {
                memberDepartments: {
                    with: {
                        department: true
                    }
                }
            }
        });

        if (!membership) {
            return { error: 'User does not belong to this team', status: 403 };
        }

        const role = membership.role;
        // Si es SUPER_ADMIN o tiene múltiples areas asignadas, devolverlas en array.
        const assignedDepartments = membership.memberDepartments.map(md => ({
            id: md.departmentId,
            name: md.department?.name || 'Department ' + md.departmentId
        }));

        return {
            user: parsed.user,
            teamId,
            role,
            assignedDepartments
        };

    } catch (error) {
        console.error('Session context error:', error);
        return { error: 'Internal Auth Error', status: 500 };
    }
}
