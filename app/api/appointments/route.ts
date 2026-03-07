import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { appointments } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth/context';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        const headerDeptIdStr = request.headers.get('x-department-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        let sessionDeptIdFilter: number | null = null;
        let allowedDepartments: number[] = [];

        // Si la petición viene desde la UI (sin API Key), aplicamos roles
        if (!headerDeptIdStr) {
            const context = await getSessionContext(request);
            if ('error' in context) {
                return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });
            }
            if (context.role !== 'SUPER_ADMIN') {
                if (context.assignedDepartments.length === 0) {
                    return NextResponse.json({ success: false, error: 'User has no assigned departments' }, { status: 403 });
                }
                allowedDepartments = context.assignedDepartments.map((d: any) => d.id);
            }
        }

        const url = new URL(request.url);
        const limitStr = url.searchParams.get('limit');
        const doctorIdStr = url.searchParams.get('doctorId');

        // Context Cookie: La UI ya no envía departmentId por parámetro, lo envía por Cookie Global
        const contextCookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('medly_department_id='))?.split('=')[1];

        // El scope viene forzado por la API Key si existe x-department-id, luego por la Cookie (UI), y finalmente por querystring (Legacy)
        const departmentIdStr = headerDeptIdStr || (contextCookie !== 'all' ? contextCookie : null) || url.searchParams.get('departmentId');

        const filters = [eq(appointments.teamId, teamId)];

        if (departmentIdStr) {
            const requestedDeptId = parseInt(departmentIdStr, 10);
            if (allowedDepartments.length > 0 && !allowedDepartments.includes(requestedDeptId)) {
                return NextResponse.json({ success: false, error: 'Forbidden department' }, { status: 403 });
            }
            filters.push(eq(appointments.departmentId, requestedDeptId));
        } else if (allowedDepartments.length > 0) {
            // "All" View / Default fallback: Filter everything they have access to
            filters.push(inArray(appointments.departmentId, allowedDepartments));
        }

        if (doctorIdStr) filters.push(eq(appointments.doctorId, parseInt(doctorIdStr, 10)));

        let query = db.query.appointments.findMany({
            where: and(...filters),
            limit: limitStr ? parseInt(limitStr, 10) : undefined,
            orderBy: (appointments, { desc }) => [desc(appointments.startTime)]
        });

        const list = await query;
        return NextResponse.json({ success: true, data: list });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        const headerDeptIdStr = request.headers.get('x-department-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        let departmentId = headerDeptIdStr ? parseInt(headerDeptIdStr, 10) : (body.departmentId ? parseInt(body.departmentId, 10) : null);

        // Si la petición viene desde UI
        if (!headerDeptIdStr) {
            const context = await getSessionContext(request);
            if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

            // Intenta extraer el contexto de la Cookie Global
            const contextCookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('medly_department_id='))?.split('=')[1];
            if (!departmentId && contextCookie && contextCookie !== 'all') {
                departmentId = parseInt(contextCookie, 10);
            }

            if (context.role !== 'SUPER_ADMIN') {
                const assignedIds = context.assignedDepartments.map((d: any) => d.id);
                // Si no asignó un ID explícito, no dejamos crearlo huérfano si no es Super Admin / Forzamos al primero
                if (!departmentId && assignedIds.length > 0) {
                    departmentId = assignedIds[0];
                } else if (departmentId && !assignedIds.includes(departmentId)) {
                    return NextResponse.json({ success: false, error: 'Cannot create appointment in an un-assigned department' }, { status: 403 });
                } else if (assignedIds.length === 0) {
                    return NextResponse.json({ success: false, error: 'User has no assigned departments' }, { status: 403 });
                }
            }
        }

        const inserted = await db.insert(appointments).values({
            teamId,
            departmentId,
            doctorId: body.doctorId,
            contactId: body.contactId,
            locationId: body.locationId,
            startTime: new Date(body.startTime),
            endTime: new Date(body.endTime),
            serviceId: body.serviceId,
            status: body.status || 'scheduled',
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
