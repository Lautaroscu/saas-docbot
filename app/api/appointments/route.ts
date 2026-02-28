import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { appointments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        const url = new URL(request.url);
        const limitStr = url.searchParams.get('limit');
        const doctorIdStr = url.searchParams.get('doctorId');

        const filters = [eq(appointments.teamId, teamId)];
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
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        const inserted = await db.insert(appointments).values({
            teamId,
            doctorId: body.doctorId,
            contactId: body.contactId,
            locationId: body.locationId,
            startTime: new Date(body.startTime),
            endTime: new Date(body.endTime),
            serviceType: body.serviceType || 'consulta',
            status: body.status || 'confirmed',
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
