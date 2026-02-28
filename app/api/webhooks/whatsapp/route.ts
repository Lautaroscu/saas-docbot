import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { assistants, contacts, doctors, appointments, teamAddresses } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { Appointment } from '@/types';

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
            return NextResponse.json({ success: false, error: 'No phone_number_id in payload' }, { status: 400 });
        }

        // Identificación: Resuelve team_id mediante wa_phone_number_id
        const assistant = await db.query.assistants.findFirst({
            where: eq(assistants.waPhoneNumberId, phoneNumberId),
        });

        if (!assistant) {
            return NextResponse.json({ success: false, error: 'Assistant not found for this phone number' }, { status: 404 });
        }

        const teamId = assistant.teamId;

        const messages = value?.messages;
        if (!messages || messages.length === 0) {
            return NextResponse.json({ success: true, message: 'No messages to process' });
        }

        const message = messages[0];
        const waId = message.from;

        // Contact Info: Buscar contacto existente
        let contactInfo: any = await db.query.contacts.findFirst({
            where: and(
                eq(contacts.teamId, teamId),
                eq(contacts.waId, waId)
            )
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
            }).returning({
                id: contacts.id,
                waId: contacts.waId,
                phone: contacts.phone
            });

            contactInfo = inserted[0];
        }

        // Contexto de Negocio: Doctores activos y sus servicios
        const activeDoctorsList = await db.query.doctors.findMany({
            where: and(
                eq(doctors.teamId, teamId),
                eq(doctors.isActive, true)
            ),
            with: {
                services: {
                    with: { service: true }
                }
            }
        });

        // Validar ventana de 6 horas para "nueva sesión" (simplificado)
        const isNewSession = true; // Todo: Query a chatMessages para ver el last timestamp.

        // Turnos futuros del paciente
        let upcomingAppointments: Appointment[] = [];
        if (contactInfo) {
            upcomingAppointments = await db.query.appointments.findMany({
                where: and(
                    eq(appointments.contactId, contactInfo.id),
                    gte(appointments.startTime, new Date()),
                    eq(appointments.status, 'confirmed')
                )
            });
        }

        // Direcciones de la clínica
        const activeAddresses = await db.query.teamAddresses.findMany({
            where: and(
                eq(teamAddresses.teamId, teamId),
                eq(teamAddresses.isActive, true)
            )
        });

        // Estructura del Fat Payload
        const fatPayload = {
            assistantConfig: {
                assistantId: assistant.id,
                teamId: teamId,
                prompt: assistant.systemPrompt,
                name: assistant.name,
                temperature: assistant.temperature
            },
            contactInfo: {
                waId: waId,
                contactId: contactInfo?.id || null,
                name: contactInfo?.name || value?.contacts?.[0]?.profile?.name || 'Unknown',
                isNewSession,
            },
            businessContext: {
                activeDoctors: activeDoctorsList.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    specialty: doc.specialty,
                    services: doc.services?.map(ds => ({
                        id: ds.service.id,
                        name: ds.service.name,
                        price: ds.service.price,
                        durationMinutes: ds.service.durationMinutes
                    })) || []
                })),
                patientAppointments: upcomingAppointments,
                teamAddresses: activeAddresses,
            },
            userMessage: message
        };

        // Forwarding to n8n webhook URL
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

        if (n8nWebhookUrl) {
            // Fire and forget behavior to evitar timeout de integraciones externas.
            fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fatPayload)
            }).catch(e => console.error('Error forwarding to n8n:', e));
        } else {
            console.warn('N8N_WEBHOOK_URL no configurada. (Fat Payload no enviado)');
        }

        return NextResponse.json({ success: true, forwarded: !!n8nWebhookUrl });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
