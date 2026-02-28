import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        const list = await db.query.contacts.findMany({
            where: eq(contacts.teamId, teamId),
            orderBy: [desc(contacts.createdAt)],
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

        const inserted = await db.insert(contacts).values({
            teamId,
            phone: body.phone,
            name: body.name,
            lastName: body.lastName,
            email: body.email,
            status: body.status || 'lead',
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
