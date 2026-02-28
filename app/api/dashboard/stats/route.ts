import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { appointments, contacts, chatMessages, services } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        // Fetch Total Appointments Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const appointmentsToday = await db.select({ count: sql<number>`count(*)` })
            .from(appointments)
            .where(and(eq(appointments.teamId, teamId), sql`DATE(${appointments.startTime}) = DATE(CURRENT_DATE)`));

        // Fetch Total Patients
        const totalPatients = await db.select({ count: sql<number>`count(*)` })
            .from(contacts)
            .where(eq(contacts.teamId, teamId));

        // Estimated Earnings (Appointments status confirmed * generic value or joining services)
        // For boilerplate, we return generic data or perform a join.

        return NextResponse.json({
            success: true,
            data: {
                appointmentsToday: appointmentsToday[0]?.count || 0,
                totalPatients: totalPatients[0]?.count || 0,
                conversionRate: 15, // placeholder
                estimatedRevenue: 150000 // placeholder
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
