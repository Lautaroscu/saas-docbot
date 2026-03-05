import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamAddresses, doctors, appointments, contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCalendarAuth, calendar, TIMEZONE, normalizeToARDate } from '@/lib/calendar/availability';

export async function POST(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);

        const body = await request.json();
        const { startTime, doctorId, serviceId, contactId, slotMinutes = 60 } = body;

        if (!startTime || !doctorId || !contactId) {
            return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
        }

        const requestedStart = normalizeToARDate(startTime);
        const requestedEnd = new Date(requestedStart.getTime() + parseInt(slotMinutes, 10) * 60000);

        // Fetch Doctor & Patient
        const [doctor, contact] = await Promise.all([
            db.query.doctors.findFirst({ where: and(eq(doctors.id, doctorId), eq(doctors.teamId, teamId)) }),
            db.query.contacts.findFirst({ where: and(eq(contacts.id, contactId), eq(contacts.teamId, teamId)) })
        ]);

        if (!doctor?.googleCalendarId) {
            return NextResponse.json({ success: false, error: 'Doctor not found or Calendar not configured' }, { status: 400 });
        }
        if (!contact) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 400 });
        }

        // --- TRANSACTION START ---

        let googleEventId = null;

        try {
            // 1. Create Event in Google Calendar
            const auth = getCalendarAuth();
            const eventResponse = await calendar.events.insert({
                auth,
                calendarId: doctor.googleCalendarId,
                requestBody: {
                    summary: `Turno: ${contact.name || ''} ${contact.lastName || ''} - ${contact.phone}`,
                    description: `Turno agendado vía Bot.\nTeléfono: ${contact.phone}\nService ID: ${serviceId || 'N/A'}`,
                    start: { dateTime: requestedStart.toISOString(), timeZone: TIMEZONE },
                    end: { dateTime: requestedEnd.toISOString(), timeZone: TIMEZONE },
                    colorId: '1', // Lavander para indicar origen Bot/Nuevo
                }
            });

            googleEventId = eventResponse.data.id;

            // 2. Insert into local Database (Drizzle Transact)
            if (googleEventId) {
                const inserted = await db.insert(appointments).values({
                    teamId,
                    contactId,
                    doctorId,
                    serviceId,
                    googleCalendarEventId: googleEventId,
                    startTime: requestedStart,
                    endTime: requestedEnd,
                    status: 'scheduled',
                    paymentStatus: 'pending',
                }).returning();

                return NextResponse.json({ success: true, data: inserted[0] });
            } else {
                throw new Error("Google Calendar did not return an Event ID");
            }
        } catch (trxError: any) {
            console.error('Book transaction error:', trxError);

            // MANUAL ROLLBACK: Si la DB falló pero creamos en Google Calendar, lo borramos.
            if (googleEventId) {
                console.log(`Rollling back: Deleting orphaned Google Calendar Event ${googleEventId}`);
                try {
                    const auth = getCalendarAuth();
                    await calendar.events.delete({
                        auth, calendarId: doctor.googleCalendarId, eventId: googleEventId
                    });
                } catch (rbError) {
                    console.error('Critical Rollback Error: Could not delete Google Calendar Event', rbError);
                }
            }

            return NextResponse.json({ success: false, error: trxError.message }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
