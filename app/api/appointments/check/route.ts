import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamAddresses, doctors, appointments } from '@/lib/db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import {
    getCalendarAuth,
    calendar,
    TIMEZONE,
    timeToMin,
    getMinutosAR,
    normalizeToARDate,
    DAY_MAP,
    getBusyBlocks,
    isSlotBusy
} from '@/lib/calendar/availability';

export async function POST(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        const { startTime, doctorId, slotMinutes = 60, locationId } = body;

        if (!startTime || !doctorId) {
            return NextResponse.json({ success: false, error: 'Missing startTime or doctorId' }, { status: 400 });
        }

        // 1. Normalizar hora de entrada
        const requestedStart = normalizeToARDate(startTime);
        const slotDuration = parseInt(slotMinutes, 10);
        const requestedEnd = new Date(requestedStart.getTime() + slotDuration * 60000);

        // 2. Traer Configuración del Doctor & Address
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, doctorId), eq(doctors.teamId, teamId))
        });

        if (!doctor) {
            return NextResponse.json({ isAvailable: false, reason: 'DOCTOR_NOT_FOUND' });
        }

        if (!doctor.googleCalendarId) {
            return NextResponse.json({ isAvailable: false, reason: 'DOCTOR_CALENDAR_NOT_CONFIGURED' });
        }

        // Buscar el address (para los horarios de la clínica). 
        // Si no mandan locationId, buscaremos la primera del team.
        let address;
        if (locationId) {
            address = await db.query.teamAddresses.findFirst({
                where: and(eq(teamAddresses.id, locationId), eq(teamAddresses.teamId, teamId))
            });
        } else {
            address = await db.query.teamAddresses.findFirst({
                where: and(eq(teamAddresses.teamId, teamId))
            });
        }

        if (!address || !address.businessHours) {
            return NextResponse.json({ isAvailable: false, reason: 'ADDRESS_NOT_CONFIGURED' });
        }

        const agendaDB = address.businessHours as Record<string, string>;

        // 3. Validar Rango de Horario Clínico Comercial
        const dateAR = new Date(requestedStart.toLocaleString("en-US", { timeZone: TIMEZONE }));
        const dayName = DAY_MAP[dateAR.getDay()];
        const range = agendaDB[dayName];

        if (!range || range === "cerrado") {
            return NextResponse.json({ isAvailable: false, reason: 'CLINIC_CLOSED' });
        }

        const [openStr, closeStr] = range.split('-');
        const openMin = timeToMin(openStr);
        const closeMin = timeToMin(closeStr);

        const requestedStartMin = getMinutosAR(requestedStart);
        const requestedEndMin = requestedStartMin + slotDuration;

        const isWithinHours = (requestedStartMin >= openMin && requestedEndMin <= closeMin);
        if (!isWithinHours) {
            return NextResponse.json({ isAvailable: false, reason: 'REASON_OUT_OF_HOURS' });
        }

        // 4. Consultar FreeBusy en Google Calendar
        // Buscamos un poco antes y un poco despues para asegurar los buffers de los eventos
        const searchStart = new Date(requestedStart.getTime() - 1000 * 60 * 60); // -1hr
        const searchEnd = new Date(requestedEnd.getTime() + 1000 * 60 * 60); // +1hr

        const busyBlocks = await getBusyBlocks(doctor.googleCalendarId, searchStart, searchEnd);

        const isGoogleBusy = isSlotBusy(requestedStart, requestedEnd, busyBlocks);

        if (isGoogleBusy) {
            return NextResponse.json({ isAvailable: false, reason: 'REASON_SLOT_TAKEN' });
        }

        // 5. Opcional/Seguridad extra: Validar en BD Local por si hay turnos agendados recientemente que aun no triggerean calendar
        const localConflicts = await db.query.appointments.findMany({
            where: and(
                eq(appointments.doctorId, doctorId),
                eq(appointments.status, 'scheduled'), // u otros estados válidos
                lt(appointments.startTime, requestedEnd),
                gt(appointments.endTime, requestedStart)
            )
        });

        if (localConflicts.length > 0) {
            return NextResponse.json({ isAvailable: false, reason: 'REASON_SLOT_TAKEN_LOCAL' });
        }

        return NextResponse.json({
            isAvailable: true,
            debug: {
                dia: dayName,
                inicio_min: requestedStartMin,
                fin_min: requestedEndMin,
                cierre_min: closeMin
            }
        });

    } catch (error: any) {
        console.error('Error in /check endpoint:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
