import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { services } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        const list = await db.query.services.findMany({
            where: eq(services.teamId, teamId)
        });

        return NextResponse.json({ success: true, data: list });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        const inserted = await db.insert(services).values({
            teamId,
            name: body.name,
            description: body.description,
            price: String(body.price),
            durationMinutes: body.durationMinutes,
            isActive: body.isActive ?? true,
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
