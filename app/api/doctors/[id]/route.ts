import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const teamId = parseInt(teamIdStr, 10);
        const { id } = await props.params;
        const docId = parseInt(id, 10);

        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, docId), eq(doctors.teamId, teamId)),
            columns: {
                id: true,
                name: true,
                specialty: true,
                googleCalendarId: true,
                isActive: true,
                mpPublicKey: true,
            },
            with: {
                services: {
                    with: {
                        service: true
                    }
                }
            }
        });

        if (!doctor) {
            return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });
        }

        // Estructuramos la respuesta para que el Front no reciba la tabla intermedia pura
        const flatDoctor = {
            ...doctor,
            services: doctor.services.map(s => s.service)
        };

        return NextResponse.json({ success: true, data: flatDoctor });
    } catch (error: any) {
        console.error('Error fetching doctor:', error); // Loguear el error real en el server
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);
        const { id } = await props.params;
        const docId = parseInt(id, 10);

        // Check doctor ownership to avoid tenant mix
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, docId), eq(doctors.teamId, teamId))
        });

        if (!doctor) return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });

        const body = await request.json();
        let updateData: any = { ...body };

        if (body.mpAccessToken) {
            updateData.mpAccessToken = encrypt(body.mpAccessToken);
        }

        const updated = await db.update(doctors)
            .set(updateData)
            .where(eq(doctors.id, docId))
            .returning();

        return NextResponse.json({ success: true, data: updated[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);
        const { id } = await props.params;
        const docId = parseInt(id, 10);

        // Verify ownership
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, docId), eq(doctors.teamId, teamId))
        });
        if (!doctor) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        await db.delete(doctors).where(eq(doctors.id, docId));

        return NextResponse.json({ success: true, data: 'Deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
