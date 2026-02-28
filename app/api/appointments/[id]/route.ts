import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { appointments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);
        const { id } = await props.params;
        const appointmentId = parseInt(id, 10);

        const appointment = await db.query.appointments.findFirst({
            where: and(eq(appointments.id, appointmentId), eq(appointments.teamId, teamId))
        });

        if (!appointment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true, data: appointment });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
