import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors, doctorsToServices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth/context';

// DELETE /api/doctors/[id]/services/[serviceId] — detach a service from a doctor
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string; serviceId: string }> }
) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
        const { id, serviceId } = await props.params;
        const docId = parseInt(id, 10);
        const svcId = parseInt(serviceId, 10);

        // Verify doctor ownership before touching the pivot table
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, docId), eq(doctors.teamId, teamId))
        });
        if (!doctor) return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });

        await db.delete(doctorsToServices)
            .where(and(
                eq(doctorsToServices.doctorId, docId),
                eq(doctorsToServices.serviceId, svcId)
            ));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
