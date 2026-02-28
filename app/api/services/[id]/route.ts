import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { services } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);
        const { id } = await props.params;
        const body = await request.json();

        // Convert price to string if exists
        let updateData = { ...body };
        if (updateData.price !== undefined) {
            updateData.price = String(updateData.price);
        }

        const updated = await db.update(services)
            .set(updateData)
            .where(and(eq(services.id, parseInt(id, 10)), eq(services.teamId, teamId)))
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

        await db.delete(services)
            .where(and(eq(services.id, parseInt(id, 10)), eq(services.teamId, teamId)));

        return NextResponse.json({ success: true, data: 'Deleted' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
