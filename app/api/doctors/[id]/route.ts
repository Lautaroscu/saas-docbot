import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';
import { getSessionContext } from '@/lib/auth/context';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
        const { id } = await props.params;
        const docId = parseInt(id, 10);

        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, docId), eq(doctors.teamId, teamId)),
            columns: {
                id: true,
                name: true,
                specialty: true,
                googleCalendarId: true,
                calendarStatus: true,
                isActive: true,
                mpPublicKey: true,
                departmentId: true,
            },
            with: {
                services: {
                    with: { service: true }
                }
            }
        });

        if (!doctor) {
            return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });
        }

        const flatDoctor = {
            ...doctor,
            services: doctor.services.map(s => s.service)
        };

        return NextResponse.json({ success: true, data: flatDoctor });
    } catch (error: any) {
        console.error('Error fetching doctor:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
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

        // Don't allow client to overwrite the refresh token directly
        delete updateData.googleRefreshToken;

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
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
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
