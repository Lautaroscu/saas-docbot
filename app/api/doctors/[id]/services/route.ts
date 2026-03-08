import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors, services, doctorsToServices } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth/context';

// GET /api/doctors/[id]/services — list services attached to a doctor
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
        const { id } = await props.params;
        const docId = parseInt(id, 10);

        // Verify doctor ownership
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, docId), eq(doctors.teamId, teamId)),
            with: {
                services: {
                    with: { service: true }
                }
            }
        });

        if (!doctor) return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });

        return NextResponse.json({ success: true, data: doctor.services.map(s => s.service) });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/doctors/[id]/services — attach a service to a doctor
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        const teamId = context.teamId;
        const { id } = await props.params;
        const docId = parseInt(id, 10);
        const body = await request.json();
        const serviceId = parseInt(body.serviceId, 10);

        // Verify doctor ownership
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, docId), eq(doctors.teamId, teamId))
        });
        if (!doctor) return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });

        // Verify service belongs to same team (and optionally same department)
        const service = await db.query.services.findFirst({
            where: and(
                eq(services.id, serviceId),
                eq(services.teamId, teamId)
            )
        });
        if (!service) return NextResponse.json({ success: false, error: 'Service not found or unauthorized' }, { status: 404 });

        // Validate same department if doctor has one
        if (doctor.departmentId && service.departmentId && doctor.departmentId !== service.departmentId) {
            return NextResponse.json({ success: false, error: 'Service belongs to a different department' }, { status: 400 });
        }

        await db.insert(doctorsToServices).values({ doctorId: docId, serviceId }).onConflictDoNothing();

        return NextResponse.json({ success: true, data: { doctorId: docId, serviceId } });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
