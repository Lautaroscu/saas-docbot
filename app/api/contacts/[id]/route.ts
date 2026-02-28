import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);
        const { id } = await props.params;

        const contact = await db.query.contacts.findFirst({
            where: and(eq(contacts.id, parseInt(id, 10)), eq(contacts.teamId, teamId))
        });

        if (!contact) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true, data: contact });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);
        const { id } = await props.params;
        const body = await request.json();

        const updated = await db.update(contacts)
            .set(body)
            .where(and(eq(contacts.id, parseInt(id, 10)), eq(contacts.teamId, teamId)))
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

        await db.delete(contacts)
            .where(and(eq(contacts.id, parseInt(id, 10)), eq(contacts.teamId, teamId)));

        return NextResponse.json({ success: true, data: 'Deleted' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
