import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { appointments } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        // This is a boilerplate stat calculator. For a real medical SaaS,
        // you would join 'appointments' with 'services' to calculate true revenue.
        const totalAppointments = await db.select({ count: sql<number>`count(*)` })
            .from(appointments)
            .where(eq(appointments.teamId, teamId));

        return NextResponse.json({
            success: true,
            data: {
                totalRevenue: 250000, // Placeholder
                availableBalance: 180000, // Placeholder
                pendingClearance: 70000,
                monthlyGrowth: 15.4
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
