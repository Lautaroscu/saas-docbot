import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { appointments, doctors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCalendarAuth, calendar } from '@/lib/calendar/availability';

export async function PATCH(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        const { appointmentId } = body;

        if (!appointmentId) {
            return NextResponse.json({ success: false, error: 'Missing appointmentId' }, { status: 400 });
        }

        // 1. Fetch Appointment and verify team ownership
        const dbAppointment = await db.query.appointments.findFirst({
            where: and(eq(appointments.id, appointmentId), eq(appointments.teamId, teamId)),
            with: { doctor: true }
        });

        if (!dbAppointment) {
            return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
        }

        // 2. Cancellation Process
        let calendarSuccess = false;

        try {
            if (dbAppointment.googleCalendarEventId && dbAppointment.doctor?.googleCalendarId) {
                const auth = getCalendarAuth();
                await calendar.events.delete({
                    auth,
                    calendarId: dbAppointment.doctor.googleCalendarId,
                    eventId: dbAppointment.googleCalendarEventId
                });
                calendarSuccess = true;
            }
        } catch (calError: any) {
            console.error(`Failed to delete event ${dbAppointment.googleCalendarEventId} from Google Calendar`, calError);
            // Incluso si falla (el usuario borró a mano el evento de google, por ej), seguimos con el Soft Delete
        }

        // 3. Database Soft Delete (Estado = Cancelled)
        const updated = await db.update(appointments)
            .set({ status: 'cancelled' })
            .where(eq(appointments.id, appointmentId))
            .returning();

        return NextResponse.json({
            success: true,
            data: updated[0],
            calendarDeleted: calendarSuccess
        });

    } catch (error: any) {
        console.error('Error in /cancel endpoint:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
