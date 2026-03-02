import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { appointments, contacts, services } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        // Boilerplate fetching recent appointments as "transactions".
        // In reality, you might query a "payments" or "invoices" table if one existed.
        const list = await db.select({
            id: appointments.id,
            date: appointments.startTime,
            status: appointments.status,
            patientName: contacts.name,
            serviceType: services.name
        })
            .from(appointments)
            .leftJoin(contacts, eq(appointments.contactId, contacts.id))
            .leftJoin(services, eq(appointments.serviceId, services.id))
            .where(eq(appointments.teamId, teamId))
            .orderBy(desc(appointments.startTime))
            .limit(30);

        return NextResponse.json({ success: true, data: list });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
