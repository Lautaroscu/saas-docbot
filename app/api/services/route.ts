import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { services } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth/context';

export async function GET(request: Request) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
        let allowedDepartments: number[] = [];

        if (context.role !== 'SUPER_ADMIN') {
            if (context.assignedDepartments.length === 0) return NextResponse.json({ success: false, error: 'No assigned departments' }, { status: 403 });
            allowedDepartments = context.assignedDepartments.map((d: any) => d.id);
        }

        // Context Cookie: La UI ya no envía departmentId por parámetro, lo envía por Cookie Global
        const contextCookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('medly_department_id='))?.split('=')[1];

        // Department from cookie — the API Key path (x-department-id) goes through the bot middleware separately.
        const departmentIdStr = contextCookie !== 'all' ? contextCookie : null;

        const filters = [eq(services.teamId, teamId)];
        if (departmentIdStr) {
            const requestedDeptId = parseInt(departmentIdStr, 10);
            if (allowedDepartments.length > 0 && !allowedDepartments.includes(requestedDeptId)) {
                return NextResponse.json({ success: false, error: 'Forbidden department' }, { status: 403 });
            }
            filters.push(eq(services.departmentId, requestedDeptId));
        } else if (allowedDepartments.length > 0) {
            // "All" View / Default fallback: Filter everything they have access to
            filters.push(inArray(services.departmentId, allowedDepartments));
        }

        const list = await db.query.services.findMany({
            where: and(...filters)
        });

        return NextResponse.json({ success: true, data: list });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
        const body = await request.json();

        // Department from cookie then body
        const contextCookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('medly_department_id='))?.split('=')[1];
        let departmentId: number | null = null;

        if (contextCookie && contextCookie !== 'all') {
            departmentId = parseInt(contextCookie, 10);
        } else if (body.departmentId) {
            departmentId = parseInt(body.departmentId, 10);
        }

        if (context.role !== 'SUPER_ADMIN') {
            const assignedIds = context.assignedDepartments.map((d: any) => d.id);
            if (!departmentId && assignedIds.length > 0) {
                departmentId = assignedIds[0];
            } else if (departmentId && !assignedIds.includes(departmentId)) {
                return NextResponse.json({ success: false, error: 'Cannot create service in unassigned department' }, { status: 403 });
            } else if (assignedIds.length === 0) {
                return NextResponse.json({ success: false, error: 'No assigned departments' }, { status: 403 });
            }
        }

        const inserted = await db.insert(services).values({
            teamId,
            departmentId,
            name: body.name,
            description: body.description,
            price: String(body.price),
            durationMinutes: body.durationMinutes,
            isActive: body.isActive ?? true,
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
