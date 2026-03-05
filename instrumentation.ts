import { Worker } from 'bullmq';
import { INBOUND_QUEUE_NAME } from './lib/queues/inboundQueue';
import { OUTBOUND_QUEUE_NAME } from './lib/queues/outboundQueue';
import redis from './lib/redis';
import { db } from '@/lib/db/drizzle';
import { assistants, contacts, doctors, appointments, teamAddresses, chatSessions, teams, apiKeys } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

const globalForWorkers = globalThis as unknown as {
    inboundWorker?: Worker;
    outboundWorker?: Worker;
};

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { whatsappService } = await import('@/lib/services/whatsapp');

        console.log('[Instrumentation] Initializing Queue Workers...');

        // -------------------------------------------------------------
        // INBOUND WORKER (Debounce & Fat Payload Builder)
        // -------------------------------------------------------------
        if (!globalForWorkers.inboundWorker) {
            globalForWorkers.inboundWorker = new Worker(
                INBOUND_QUEUE_NAME,
                async (job) => {
                    const { contactId, phoneNumberId, waId, teamId } = job.data;
                    const bufferKey = `buffer:msg:${contactId}`;
                    const processingKey = `buffer:msg:${contactId}:processing`;

                    // Atomically move messages
                    try {
                        await redis.rename(bufferKey, processingKey);
                    } catch (e: any) {
                        if (e.message.includes('ERR no such key')) return; // Empty buffer
                        throw e;
                    }

                    const rawMessages = await redis.lrange(processingKey, 0, -1);
                    await redis.del(processingKey);

                    if (rawMessages.length === 0) return;

                    // Aggregate Text
                    let aggregatedText = '';
                    let firstMessageObj = null;

                    for (const raw of rawMessages) {
                        try {
                            const parsed = JSON.parse(raw);
                            if (!firstMessageObj) firstMessageObj = parsed;
                            let textChunk = parsed?.text?.body || '';

                            // Extract from Button or Interactive if present
                            if (parsed?.type === 'button') textChunk = parsed?.button?.text || '';
                            if (parsed?.type === 'interactive') textChunk = parsed?.interactive?.button_reply?.title || parsed?.interactive?.list_reply?.title || '';

                            if (textChunk) {
                                aggregatedText += textChunk + '\n';
                            }
                        } catch (e) {
                            console.error('Error parsing raw message in worker', e);
                        }
                    }

                    if (!aggregatedText.trim() || !firstMessageObj) {
                        console.log(`[Worker Inbound] Blank aggregated message for ${contactId}. Skipping n8n.`);
                        return;
                    }

                    // Build Fat Payload logic (Extracted from Webhook)
                    console.log(`[Worker Inbound] Compiling DB Context for ${contactId} with text: ${aggregatedText.substring(0, 20)}...`);

                    // Replace text body of first message with the aggregated one
                    if (firstMessageObj.text) {
                        firstMessageObj.text.body = aggregatedText.trim();
                    } else {
                        firstMessageObj.text = { body: aggregatedText.trim() };
                    }
                    firstMessageObj.type = 'text'; // Normalize to text for the Agent

                    const assistant = await db.query.assistants.findFirst({
                        where: eq(assistants.waPhoneNumberId, phoneNumberId),
                    });
                    const team = await db.query.teams.findFirst({
                        where: eq(teams.id, teamId)
                    });
                    const teamApiKey = await db.query.apiKeys.findFirst({
                        where: eq(apiKeys.teamId, teamId)
                    });

                    let contactInfo = await db.query.contacts.findFirst({
                        where: eq(contacts.id, contactId)
                    });

                    if (contactInfo && contactInfo.botStatus !== 'ACTIVE') {
                        const pauseUntilDate = contactInfo.pauseUntil ? new Date(contactInfo.pauseUntil) : null;
                        if (!pauseUntilDate || pauseUntilDate > new Date()) {
                            console.log(`[Worker Inbound] Bot paused for contact ${contactInfo.id}. Skipping FatPayload.`);
                            return; // Do not forward to n8n
                        } else {
                            await db.update(contacts)
                                .set({ botStatus: 'ACTIVE', pauseUntil: null })
                                .where(eq(contacts.id, contactInfo.id));
                        }
                    }

                    const activeSession = await db.query.chatSessions.findFirst({
                        where: and(
                            eq(chatSessions.contactId, contactId),
                            gte(chatSessions.expiresAt, new Date())
                        ),
                        orderBy: (sessions, { desc }) => [desc(sessions.createdAt)]
                    });
                    const isNewSession = !activeSession;

                    const upcomingAppointments = await db.query.appointments.findMany({
                        where: and(
                            eq(appointments.contactId, contactId),
                            gte(appointments.startTime, new Date()),
                            eq(appointments.status, 'scheduled')
                        )
                    });

                    const activeAddresses = await db.query.teamAddresses.findMany({
                        where: and(eq(teamAddresses.teamId, teamId), eq(teamAddresses.isActive, true))
                    });

                    const fatPayload = {
                        assistantConfig: {
                            assistantId: assistant?.id,
                            teamId: teamId,
                            prompt: assistant?.systemPrompt,
                            name: assistant?.name,
                            temperature: assistant?.temperature
                        },
                        contactInfo: {
                            waId: waId,
                            contactId: contactId,
                            name: contactInfo?.name || firstMessageObj?.contacts?.[0]?.profile?.name || 'Unknown',
                            lastName: contactInfo?.lastName || firstMessageObj?.contacts?.[0]?.profile?.last_name || 'Unknown',
                            phone: contactInfo?.phone || waId,
                            email: contactInfo?.email || '',
                            isNewSession,
                        },
                        businessContext: {
                            patientAppointments: upcomingAppointments,
                            teamAddressDefault: activeAddresses[0],
                            teamName: team?.name,
                            apiKey: teamApiKey?.apiKey
                        },
                        sessionContext: {
                            chatSessionId: activeSession?.id || null,
                            status: activeSession?.status || 'IDLE',
                            selectedDoctorId: activeSession?.selectedDoctorId || null,
                            selectedServiceId: activeSession?.selectedServiceId || null,
                            selectedSlot: activeSession?.selectedSlot || null,
                            lastIntent: activeSession?.lastIntent || null,
                            metadata: activeSession?.metadata || {},
                        },
                        userMessage: firstMessageObj // Enriched message
                    };

                    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
                    if (n8nWebhookUrl) {
                        await fetch(n8nWebhookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(fatPayload)
                        }).catch(e => console.error('Error forwarding to n8n from Inbound worker:', e));
                    } else {
                        console.warn('[Worker Inbound] N8N_WEBHOOK_URL not configured.');
                    }
                },
                { connection: redis as any, concurrency: 5 }
            );

            globalForWorkers.inboundWorker.on('failed', (job, err) => {
                console.error(`[Inbound Worker] Job ${job?.id} falló:`, err.message);
            });
        }

        // -------------------------------------------------------------
        // OUTBOUND WORKER (WhatsApp Sender)
        // -------------------------------------------------------------
        if (!globalForWorkers.outboundWorker) {
            globalForWorkers.outboundWorker = new Worker(
                OUTBOUND_QUEUE_NAME,
                async (job) => {
                    const { phone, text, teamId } = job.data;

                    // Concurrency is 1 por default en QueueOptions o WorkerOptions (arriba le mandamos concurrency 1)
                    // para mantener FIFO estricto. (Para priorizar por Contacto, requiere BullMQ Pro "Groups" - usamos FIFO baseline)
                    console.log(`[Worker Outbound] Enviando MSJ WhatsApp a ${phone} (Team ${teamId})...`);

                    const success = await whatsappService.sendText(phone, text, teamId);
                    if (!success) {
                        throw new Error(`WhatsApp API delivery failed for phone ${phone}`);
                    }
                    console.log(`[Worker Outbound] Mensaje entregado a ${phone} exitosamente.`);
                },
                { connection: redis as any, concurrency: 1, limiter: { max: 10, duration: 1000 } }
                // Rate Limit Seguro API WA: 10 msg/seg
            );

            globalForWorkers.outboundWorker.on('failed', (job, err) => {
                console.error(`[Outbound Worker] Job ${job?.id} falló. (Reintento automático):`, err.message);
            });
        }
    }
}
