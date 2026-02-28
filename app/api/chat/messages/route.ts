import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages } from '@/lib/db/schema';

export async function POST(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        if (!body.contactId || !body.sessionId || !body.role || !body.content) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const inserted = await db.insert(chatMessages).values({
            teamId,
            contactId: body.contactId,
            sessionId: body.sessionId,
            role: body.role, // 'user' | 'assistant' | 'system'
            content: body.content,
            metadata: body.metadata || {},
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        console.error('Error inserting chat message:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
