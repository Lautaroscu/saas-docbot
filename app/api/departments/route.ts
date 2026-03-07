import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { departments, teams, teamMembers, plans } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getUser } from '@/lib/auth/session';

export async function POST(request: Request) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Team ID missing' }, { status: 400 });
        }
        const teamId = parseInt(teamIdStr, 10);

        // Validar que el usuario que intenta crear un area es SUPER_ADMIN o ADMIN (Role Control)
        const membership = await db.query.teamMembers.findFirst({
            where: (members, { and, eq }) => and(eq(members.userId, user.id), eq(members.teamId, teamId)),
        });

        if (!membership || membership.role === 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json({ success: false, error: 'Department name is required' }, { status: 400 });
        }

        // TAREA: "La creación de departamentos debe ejecutarse dentro de una transacción 
        // de base de datos con nivel de aislamiento SERIALIZABLE (o un chequeo de conteo bloqueante)."
        // Drizzle ORM Soporta Isolation Levels en transaction()

        let insertedDepartment = null;

        await db.transaction(async (tx) => {
            // 1. Obtener el Plan asociado al Team
            const teamWithPlan = await tx.select({
                maxDepartments: plans.maxDepartments
            }).from(teams)
                .innerJoin(plans, eq(teams.planId, plans.id))
                .where(eq(teams.id, teamId))
                .limit(1);

            if (teamWithPlan.length === 0) {
                throw new Error("Team plan not found");
            }

            const limit = teamWithPlan[0].maxDepartments;

            // 2. Contar los departamentos existentes (lock preventivo de conteos depende de PostgreSQL)
            const currentCountResult = await tx
                .select({ count: sql<number>`cast(count(*) as integer)` })
                .from(departments)
                .where(eq(departments.teamId, teamId));

            const currentCount = currentCountResult[0].count;

            if (currentCount >= limit) {
                throw new Error(`Plan limit exceeded: You can only have up to ${limit} departments in your current plan.`);
            }

            // 3. Crear el departamento
            const inserted = await tx.insert(departments).values({
                teamId,
                name: name.trim(),
                isActive: true
            }).returning();

            insertedDepartment = inserted[0];
        }, {
            isolationLevel: 'serializable',
            accessMode: 'read write'
        });

        return NextResponse.json({ success: true, data: insertedDepartment });

    } catch (error: any) {
        if (error.message.includes('Plan limit exceeded')) {
            return NextResponse.json({ success: false, error: error.message }, { status: 403 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
