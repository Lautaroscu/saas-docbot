import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, contacts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        const teamId = parseInt(teamIdStr, 10);

        // Fetch the most recent messages for the whole team, joining with contacts to get the names
        const recentMessages = await db.select({
            id: chatMessages.id,
            content: chatMessages.content,
            role: chatMessages.role,
            createdAt: chatMessages.createdAt,
            contactName: contacts.name,
            contactPhone: contacts.phone,
            contactWaId: contacts.waId,
        })
            .from(chatMessages)
            .leftJoin(contacts, eq(chatMessages.contactId, contacts.id))
            .where(eq(chatMessages.teamId, teamId))
            .orderBy(desc(chatMessages.createdAt))
            .limit(20);

        return NextResponse.json({ success: true, data: recentMessages });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
