import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: Request, props: { params: Promise<{ contactId: string }> }) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const teamId = parseInt(teamIdStr, 10);
        const { contactId: contactIdStr } = await props.params;
        const contactId = parseInt(contactIdStr, 10);

        // Fetch the last 10 messages for the given contactId and teamId
        // Ordered by newest first so we can limit to 10, then we reverse to chronological order
        const history = await db.query.chatMessages.findMany({
            where: and(
                eq(chatMessages.contactId, contactId),
                eq(chatMessages.teamId, teamId)
            ),
            orderBy: [desc(chatMessages.createdAt)],
            limit: 10,
        });

        const chronologicalHistory = history.reverse();

        return NextResponse.json({ success: true, data: chronologicalHistory });
    } catch (error: any) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
