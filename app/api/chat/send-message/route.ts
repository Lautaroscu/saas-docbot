import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, contacts, chatSessions } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { whatsappService } from '@/lib/services/whatsapp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contactId, sessionId, text, teamId, phone, sessionUpdate, action, metadata } = body;

        // "action" expects: SEND_MESSAGE, DEACTIVATE_SESSION, NOTIFY_HUMAN, UPDATE_CONTEXT, READY_TO_BOOK
        const reqAction = action || 'SEND_MESSAGE';

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

        // 1.2. Buscar sesion activa actual
        let activeSession = await db.query.chatSessions.findFirst({
            where: and(
                eq(chatSessions.contactId, contactId),
                gte(chatSessions.expiresAt, new Date())
            ),
            orderBy: (sessions, { desc }) => [desc(sessions.createdAt)]
        });

        const currentSessionMetadata = (activeSession?.metadata as any) || {};

        // 1.3 Estrategias Especiales (CLINICAL_QUERY y OUT_OF_DOMAIN)
        let shouldPauseBot = false;
        let pauseMinutes = 0;
        let finalBotStatus = 'SYSTEM_PAUSED';
        let newOutOfDomainCount = currentSessionMetadata.outOfDomainCount || 0;

        const currentIntent = sessionUpdate?.lastIntent || metadata?.reason;

        // Estrategia 1: CLINICAL_QUERY
        if (reqAction === 'DEACTIVATE_SESSION' || currentIntent === 'CLINICAL_QUERY') {
            shouldPauseBot = true;
            pauseMinutes = 30;
        }

        // Estrategia 2: OUT_OF_DOMAIN (3 consecutivos)
        if (currentIntent === 'OUT_OF_DOMAIN') {
            newOutOfDomainCount += 1;
            if (newOutOfDomainCount >= 3) {
                shouldPauseBot = true;
                pauseMinutes = 60;
                newOutOfDomainCount = 0; // reset
            }
        } else if (currentIntent) {
            newOutOfDomainCount = 0; // reset if a different intent was explicitly given
        }

        // Actualizar contacto si cambia el estado
        if (shouldPauseBot) {
            const pauseUntilDate = new Date();
            pauseUntilDate.setMinutes(pauseUntilDate.getMinutes() + pauseMinutes);

            await db.update(contacts).set({
                botStatus: finalBotStatus,
                pauseUntil: pauseUntilDate
            }).where(eq(contacts.id, contactId));

            console.log(`[Strategy Executed] Bot paused for contact ${contactId} for ${pauseMinutes} mins. Intent: ${currentIntent}`);
        }

        // 1.5. Update chat_sessions si hay sessionUpdate o si actualizamos el contador OUT_OF_DOMAIN
        const mergedSessionMetadata = {
            ...currentSessionMetadata,
            ...(sessionUpdate?.metadata || {}),
            outOfDomainCount: newOutOfDomainCount
        };

        if (sessionUpdate && Object.keys(sessionUpdate).length > 0) {
            const validUpdate: any = {};
            if (sessionUpdate.status !== undefined) validUpdate.status = sessionUpdate.status;
            if (sessionUpdate.selectedDoctorId !== undefined) validUpdate.selectedDoctorId = sessionUpdate.selectedDoctorId;
            if (sessionUpdate.selectedServiceId !== undefined) validUpdate.selectedServiceId = sessionUpdate.selectedServiceId;
            if (sessionUpdate.selectedSlot !== undefined) validUpdate.selectedSlot = sessionUpdate.selectedSlot ? new Date(sessionUpdate.selectedSlot) : null;
            if (sessionUpdate.lastIntent !== undefined) validUpdate.lastIntent = sessionUpdate.lastIntent;

            validUpdate.metadata = mergedSessionMetadata;

            if (Object.keys(validUpdate).length > 0) {
                if (activeSession) {
                    await db.update(chatSessions)
                        .set({
                            ...validUpdate,
                            updatedAt: new Date()
                        })
                        .where(eq(chatSessions.id, activeSession.id));
                } else {
                    const expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + 4);
                    await db.insert(chatSessions).values({
                        teamId,
                        contactId,
                        ...validUpdate,
                        status: validUpdate.status || 'IDLE',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        expiresAt
                    });
                }
            }
        } else if (activeSession && newOutOfDomainCount !== (currentSessionMetadata.outOfDomainCount || 0)) {
            // Aún si no hay sessionUpdate formal, guardamos el nuevo conteo de OUT_OF_DOMAIN
            await db.update(chatSessions)
                .set({
                    metadata: mergedSessionMetadata,
                    updatedAt: new Date()
                })
                .where(eq(chatSessions.id, activeSession.id));
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
