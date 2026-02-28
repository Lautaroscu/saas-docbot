import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { whatsappService } from '@/lib/services/whatsapp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contactId, sessionId, text, teamId, phone } = body;

        if (!contactId || !sessionId || !text || !teamId || !phone) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Validación Final: Revisar si el bot está pausado para el paciente
        const contactInfo = await db.query.contacts.findFirst({
            where: and(
                eq(contacts.id, contactId),
                eq(contacts.teamId, teamId)
            )
        });

        if (!contactInfo) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        if (contactInfo.botStatus === 'PAUSED') {
            const pauseUntilDate = contactInfo.pauseUntil ? new Date(contactInfo.pauseUntil) : null;
            if (!pauseUntilDate || pauseUntilDate > new Date()) {
                console.log(`Bot is paused for contact ${contactId}. Message not sent.`);
                // Return 200 to acknowledge n8n without retrying
                return NextResponse.json({ success: true, message: 'Bot is paused, message skipped.' });
            }
        }

        // 2. Persistir el mensaje en chat_messages (para que aparezca en el Dashboard)
        await db.insert(chatMessages).values({
            contactId,
            sessionId,
            role: 'assistant',
            content: text,
            teamId,
            metadata: { source: 'n8n_outbound' }
        });

        // 3. Enviar mensaje final al paciente a través del Inbound Gateway
        const success = await whatsappService.sendText(phone, text, teamId);

        if (!success) {
            return NextResponse.json({ success: false, error: 'Failed to send WhatsApp message' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Message sent and logged successfully' });

    } catch (error: any) {
        console.error('Outbound Gateway Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
