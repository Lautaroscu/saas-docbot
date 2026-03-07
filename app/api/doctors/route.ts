import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth/context';
import { encrypt } from '@/lib/encryption';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        const headerDeptIdStr = request.headers.get('x-department-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);

        let allowedDepartments: number[] = [];

        if (!headerDeptIdStr) {
            const context = await getSessionContext(request);
            if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

            if (context.role !== 'SUPER_ADMIN') {
                if (context.assignedDepartments.length === 0) return NextResponse.json({ success: false, error: 'No assigned departments' }, { status: 403 });
                allowedDepartments = context.assignedDepartments.map((d: any) => d.id);
            }
        }

        const { searchParams } = new URL(request.url);

        // Context Cookie: La UI ya no envía departmentId por parámetro, lo envía por Cookie Global
        const contextCookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('medly_department_id='))?.split('=')[1];

        // El scope viene forzado por la API Key si existe x-department-id.
        // Si la key es global, permite que el cliente pida un departamento específico o traiga todo.
        const departmentIdStr = headerDeptIdStr || (contextCookie !== 'all' ? contextCookie : null) || searchParams.get('departmentId');

        const filters = [eq(doctors.teamId, teamId), eq(doctors.isActive, true)];

        if (departmentIdStr) {
            const requestedDeptId = parseInt(departmentIdStr, 10);
            if (allowedDepartments.length > 0 && !allowedDepartments.includes(requestedDeptId)) {
                return NextResponse.json({ success: false, error: 'Forbidden department' }, { status: 403 });
            }
            filters.push(eq(doctors.departmentId, requestedDeptId));
        } else if (allowedDepartments.length > 0) {
            // "All" View / Default fallback: Filter everything they have access to
            filters.push(inArray(doctors.departmentId, allowedDepartments));
        }

        const docs = await db.query.doctors.findMany({
            where: and(...filters),
            with: {
                services: {
                    with: { service: true }
                }
            }
        });

        return NextResponse.json({ success: true, data: docs });
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

        let encryptedMpToken = null;
        if (body.mpAccessToken) {
            encryptedMpToken = encrypt(body.mpAccessToken);
        }

        // Si la API key pertenece a un scope, forzamos a que solo se creen doctores en ese scope.
        // Si es global, usamos el del body (si lo mandan).
        let departmentId = headerDeptIdStr ? parseInt(headerDeptIdStr, 10) : (body.departmentId ? parseInt(body.departmentId, 10) : null);

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
                if (!departmentId && assignedIds.length > 0) {
                    departmentId = assignedIds[0];
                } else if (departmentId && !assignedIds.includes(departmentId)) {
                    return NextResponse.json({ success: false, error: 'Cannot create doctor in unassigned department' }, { status: 403 });
                } else if (assignedIds.length === 0) {
                    return NextResponse.json({ success: false, error: 'No assigned departments' }, { status: 403 });
                }
            }
        }

        const inserted = await db.insert(doctors).values({
            teamId,
            departmentId,
            name: body.name,
            specialty: body.specialty,
            googleCalendarId: body.googleCalendarId,
            mpAccessToken: encryptedMpToken,
            mpPublicKey: body.mpPublicKey,
            mpUserId: body.mpUserId,
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
