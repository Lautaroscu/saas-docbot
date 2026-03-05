import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, contacts, chatSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { outboundQueue } from '@/lib/queues/outboundQueue';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contactId, sessionId, text, teamId, phone, sessionUpdate, action, metadata } = body;

        if (!contactId || !sessionId || !text || !teamId || !phone) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Transacción de Base de Datos para asegurar consistencia ANTES de encolar
        await db.transaction(async (tx) => {
            // 2.1 Verificar pausa
            const contact = await tx.query.contacts.findFirst({
                where: and(eq(contacts.id, contactId), eq(contacts.teamId, teamId))
            });

            if (contact?.botStatus === 'PAUSED' && (!contact.pauseUntil || new Date(contact.pauseUntil) > new Date())) {
                return; // Ya procesado, evitamos updates innecesarios
            }

            // 2.2 Lógica de Estrategia (Clinical / Out of Domain)
            const activeSession = await tx.query.chatSessions.findFirst({
                where: eq(chatSessions.id, sessionId)
            });

            const currentMetadata = (activeSession?.metadata as any) || {};
            const currentIntent = sessionUpdate?.lastIntent || metadata?.reason;

            let { outOfDomainCount = 0 } = currentMetadata;
            let pauseUntil: Date | null = null;

            if (action === 'DEACTIVATE_SESSION' || currentIntent === 'CLINICAL_QUERY') {
                pauseUntil = new Date(Date.now() + 30 * 60000);
            } else if (currentIntent === 'OUT_OF_DOMAIN') {
                outOfDomainCount++;
                if (outOfDomainCount >= 3) {
                    pauseUntil = new Date(Date.now() + 60 * 60000);
                    outOfDomainCount = 0;
                }
            } else if (['AGENDAR', 'CANCELAR'].includes(currentIntent)) {
                outOfDomainCount = 0;
            }

            // 2.3 Updates en Contacto
            if (pauseUntil) {
                await tx.update(contacts)
                    .set({ botStatus: 'SYSTEM_PAUSED', pauseUntil })
                    .where(eq(contacts.id, contactId));
            }

            // 2.4 Persistencia de Mensaje
            await tx.insert(chatMessages).values({
                contactId,
                sessionId,
                role: 'assistant',
                content: text,
                teamId,
                metadata: { source: 'n8n_outbound', intent: currentIntent }
            });

            // 2.5 Update de Sesión
            if (sessionUpdate) {
                await tx.update(chatSessions)
                    .set({
                        ...sessionUpdate,
                        selectedSlot: sessionUpdate.selectedSlot ? new Date(sessionUpdate.selectedSlot) : null,
                        metadata: { ...currentMetadata, outOfDomainCount },
                        updatedAt: new Date()
                    })
                    .where(eq(chatSessions.id, sessionId));
            }
        });

        // 2. Encolar el mensaje en BullMQ (Outbound Queue)
        // Usamos el `phone` u otro identificador como grupo lógico si fuese BullMQ Pro, 
        // pero con concurrency 1 aseguramos que todos salgan en orden global.
        await outboundQueue.add('send-whatsapp', {
            phone,
            text,
            teamId,
            contactId,
        });

        console.log(`[Outbound Gateway] Message for ${phone} enqueued successfully.`);

        return NextResponse.json({ success: true, queued: true });

    } catch (error: any) {
        console.error('Outbound Gateway Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}