import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth/context';
import { encrypt } from '@/lib/encryption';

async function resolveAuth(request: Request) {
    const teamIdHeader = request.headers.get('x-team-id');
    const deptIdHeader = request.headers.get('x-department-id');

    if (teamIdHeader) {
        // 🤖 Bot/external client — middleware already validated the API key
        return {
            teamId: parseInt(teamIdHeader, 10),
            role: 'SUPER_ADMIN' as const,
            assignedDepartments: [] as any[],
            forcedDeptId: deptIdHeader ? parseInt(deptIdHeader, 10) : null,
        };
    }

    // 🖥️ Dashboard — validate via session cookie
    const context = await getSessionContext(request);
    console.log(context);
    if ('error' in context) return context;

    return {
        teamId: context.teamId,
        role: context.role,
        assignedDepartments: context.assignedDepartments,
        forcedDeptId: null,
    };
}

export async function GET(request: Request) {
    try {
        const auth = await resolveAuth(request);

        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status as number });

        const { teamId, role, assignedDepartments } = auth;
        const forcedDeptId = 'forcedDeptId' in auth ? auth.forcedDeptId : null;

        let allowedDepartments: number[] = [];
        if (role !== 'SUPER_ADMIN') {
            if (assignedDepartments.length === 0) return NextResponse.json({ success: false, error: 'No assigned departments' }, { status: 403 });
            allowedDepartments = assignedDepartments.map((d: any) => d.id);
        }

        // Department from forced header (bot scoped key) or cookie (dashboard)
        const contextCookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('medly_department_id='))?.split('=')[1];
        const departmentIdStr = forcedDeptId
            ? String(forcedDeptId)
            : (contextCookie && contextCookie !== 'all' ? contextCookie : null);

        const filters = [eq(doctors.teamId, teamId)];

        if (departmentIdStr) {
            const requestedDeptId = parseInt(departmentIdStr, 10);
            if (allowedDepartments.length > 0 && !allowedDepartments.includes(requestedDeptId)) {
                return NextResponse.json({ success: false, error: 'Forbidden department' }, { status: 403 });
            }
            filters.push(eq(doctors.departmentId, requestedDeptId));
        } else if (allowedDepartments.length > 0) {
            filters.push(inArray(doctors.departmentId, allowedDepartments));
        }

        const docs = await db.query.doctors.findMany({
            where: and(...filters),
            with: { services: { with: { service: true } } }
        });

        return NextResponse.json({ success: true, data: docs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await resolveAuth(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status as number });

        const { teamId, role, assignedDepartments } = auth;
        const forcedDeptId = 'forcedDeptId' in auth ? auth.forcedDeptId : null;
        const body = await request.json();


        let encryptedMpToken = null;
        if (body.mpAccessToken) encryptedMpToken = encrypt(body.mpAccessToken);

        // Department: bot forced key > cookie > body > assignedDepartments[0]
        const contextCookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('medly_department_id='))?.split('=')[1];
        let departmentId: number | null = forcedDeptId;

        if (!departmentId && contextCookie && contextCookie !== 'all') departmentId = parseInt(contextCookie, 10);
        if (!departmentId && body.departmentId) departmentId = parseInt(body.departmentId, 10);

        if (role !== 'SUPER_ADMIN') {
            const assignedIds = assignedDepartments.map((d: any) => d.id);
            if (!departmentId && assignedIds.length > 0) departmentId = assignedIds[0];
            else if (departmentId && !assignedIds.includes(departmentId)) return NextResponse.json({ success: false, error: 'Cannot create doctor in unassigned department' }, { status: 403 });
            else if (assignedIds.length === 0) return NextResponse.json({ success: false, error: 'No assigned departments' }, { status: 403 });
        }

        const inserted = await db.insert(doctors).values({
            teamId,
            departmentId,
            name: body.name,
            specialty: body.specialty ?? null,
            googleCalendarId: body.googleCalendarId ?? null,
            mpAccessToken: encryptedMpToken,
            mpPublicKey: body.mpPublicKey ?? null,
            mpUserId: body.mpUserId ?? null,
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
