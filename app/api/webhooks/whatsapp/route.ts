import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { assistants, contacts, teams } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import redis from '@/lib/redis';
import { inboundQueue } from '@/lib/queues/inboundQueue';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
        const assistant = await db.query.assistants.findFirst({
            where: eq(assistants.waVerifyToken, token)
        });

        if (assistant) {
            return new NextResponse(challenge, { status: 200 });
        }
    }

    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const metadata = value?.metadata;
        const phoneNumberId = metadata?.phone_number_id;

        if (!phoneNumberId) {
            // Omitimos logs pesados para pings vacíos
            return NextResponse.json({ success: true });
        }

        const messages = value?.messages;
        if (!messages || messages.length === 0) {
            return NextResponse.json({ success: true, message: 'No messages to process' });
        }

        const message = messages[0];
        const waId = message.from;
        const metaMessageId = message.id; // Meta unique ID

        // 1. Idempotencia y Filtrado Rápido (Meta re-intenta si no hay 200 OK rapido)
        const idempotencyKey = `webhook:msg:${metaMessageId}`;
        const isNewMessage = await redis.setnx(idempotencyKey, '1');

        if (!isNewMessage) {
            console.log(`[Webhook] Duplicate Meta ID ignored: ${metaMessageId}`);
            return NextResponse.json({ success: true, message: 'Already processed' });
        }
        await redis.expire(idempotencyKey, 86400); // 24hs TTL

        // 2. Resolver Assistant y Contacto Base
        const assistant = await db.query.assistants.findFirst({
            where: eq(assistants.waPhoneNumberId, phoneNumberId),
        });

        if (!assistant) {
            return NextResponse.json({ success: false, error: 'Assistant not found' }, { status: 404 });
        }

        const teamId = assistant.teamId;
        const departmentId = assistant.departmentId;

        let contactId: number | undefined;

        // Ensure contact exists or insert minimal version
        const contactInfo = await db.query.contacts.findFirst({
            where: and(eq(contacts.teamId, teamId), eq(contacts.waId, waId))
        });

        if (!contactInfo) {
            let phone = waId;
            if (waId.startsWith('549') && waId.length === 13) {
                phone = waId.slice(3);
            } else if (waId.startsWith('54') && waId.length === 12) {
                phone = waId.slice(2);
            }

            const inserted = await db.insert(contacts).values({
                teamId,
                waId,
                phone,
            }).returning({ id: contacts.id });

            contactId = inserted[0]?.id;
        } else {
            contactId = contactInfo.id;
        }

        if (!contactId) return NextResponse.json({ success: false, error: 'Contact ID missing' });
        if (!contactId) return NextResponse.json({ success: false, error: 'Contact ID missing' });

        // 3. Debouncing (Acumulador en Redis)
        const bufferKey = `buffer:msg:${contactId}`;

        // Empujamos el payload entero del mensaje a la cola (texto, botones, audios) para que Worker lo parsee
        await redis.rpush(bufferKey, JSON.stringify(message));

        // 4. Calendarizar Job en BullMQ (Delay de 5 segundos)
        // Usamos como Job ID el contactId para que reemplace el timer si entran juntos
        // BullMQ throws error if jobId contains ':' so we use '_'
        await inboundQueue.add(
            'process-inbound',
            { contactId, phoneNumberId, waId, teamId, departmentId },
            {
                jobId: `debounce_${contactId}`,
                delay: 5000
            }
        );

        console.log(`[Webhook] Message from ${waId} buffered. Will process in 5s.`);

        return NextResponse.json({ success: true, buffered: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
