import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { assistants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth/context';

// GET /api/assistants
// Returns assistant config for the active department (read from cookie medly_department_id)
export async function GET(request: Request) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;

        // Department is read exclusively from the medly_department_id cookie (set by middleware).
        // If the cookie is 'all' or missing, there's no specific department context — return null.
        const contextCookie = request.headers.get('cookie')?.split('; ').find(r => r.startsWith('medly_department_id='))?.split('=')[1];

        if (!contextCookie || contextCookie === 'all') {
            return NextResponse.json({ success: true, data: null });
        }

        const departmentIdStr = contextCookie;

        const departmentId = parseInt(departmentIdStr, 10);

        // Make sure non-super-admins can only access their own departments
        if (context.role !== 'SUPER_ADMIN') {
            const assignedIds = context.assignedDepartments.map((d: any) => d.id);
            if (!assignedIds.includes(departmentId)) {
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }
        }

        const assistant = await db.query.assistants.findFirst({
            where: and(eq(assistants.teamId, teamId), eq(assistants.departmentId, departmentId))
        });

        return NextResponse.json({ success: true, data: assistant ?? null });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/assistants
// Upsert assistant config for the active department
export async function POST(request: Request) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;

        // Only SUPER_ADMIN and ADMIN can create/update assistants
        if (context.role === 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors cannot modify assistant configuration' }, { status: 403 });
        }

        const body = await request.json();
        const { name, waPhoneNumberId, waVerifyToken, persona, tone, initialGreeting, temperature, isActive, departmentId: bodyDeptId } = body;

        const contextCookie = request.headers.get('cookie')?.split('; ').find(r => r.startsWith('medly_department_id='))?.split('=')[1];
        const departmentIdStr = contextCookie !== 'all' ? contextCookie : String(bodyDeptId ?? '');

        if (!departmentIdStr) {
            return NextResponse.json({ success: false, error: 'No department context' }, { status: 400 });
        }

        const departmentId = parseInt(departmentIdStr, 10);

        // Non-SUPER_ADMIN can only write to their own departments
        if (context.role !== 'SUPER_ADMIN') {
            const assignedIds = context.assignedDepartments.map((d: any) => d.id);
            if (!assignedIds.includes(departmentId)) {
                return NextResponse.json({ success: false, error: 'Forbidden department' }, { status: 403 });
            }
        }

        const existing = await db.query.assistants.findFirst({
            where: and(eq(assistants.teamId, teamId), eq(assistants.departmentId, departmentId))
        });

        let result;
        if (existing) {
            result = await db.update(assistants)
                .set({
                    name: name ?? existing.name,
                    waPhoneNumberId: waPhoneNumberId ?? existing.waPhoneNumberId,
                    waVerifyToken: waVerifyToken ?? existing.waVerifyToken,
                    persona: persona ?? existing.persona,
                    tone: tone ?? existing.tone,
                    initialGreeting: initialGreeting ?? existing.initialGreeting,
                    temperature: temperature !== undefined ? String(temperature) : existing.temperature,
                    isActive: isActive !== undefined ? isActive : existing.isActive,
                })
                .where(eq(assistants.id, existing.id))
                .returning();
        } else {
            // Create new assistant for this department
            result = await db.insert(assistants).values({
                teamId,
                departmentId,
                name: name ?? 'Asistente',
                waPhoneNumberId: waPhoneNumberId ?? '',
                waVerifyToken,
                persona: persona ?? '',
                tone: tone ?? 'Profesional',
                initialGreeting: initialGreeting ?? '',
                temperature: temperature !== undefined ? String(temperature) : '0.7',
                isActive: isActive ?? true,
            }).returning();
        }

        return NextResponse.json({ success: true, data: result[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
