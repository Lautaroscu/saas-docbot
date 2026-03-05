import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamAddresses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);

        const addresses = await db.query.teamAddresses.findMany({
            where: and(
                eq(teamAddresses.teamId, teamId),
                eq(teamAddresses.isActive, true)
            ),
        });

        return NextResponse.json({ success: true, data: addresses });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
