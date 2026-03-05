import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamAddresses, doctors, appointments } from '@/lib/db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import {
    TIMEZONE,
    timeToMin,
    getMinutosAR,
    normalizeToARDate,
    DAY_MAP,
    getBusyBlocks,
    isSlotBusy
} from '@/lib/calendar/availability';

export async function GET(request: Request) {
    try {
        const url = new Date(request.url); // Solo para acceder a searchParams, pero usaremos request.url
        const { searchParams } = new URL(request.url);

        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);

        const rangeStartStr = searchParams.get('rangeStart');
        const rangeEndStr = searchParams.get('rangeEnd');
        const doctorIdStr = searchParams.get('doctorId');
        const slotMinutesStr = searchParams.get('slotMinutes') || '60';
        const locationIdStr = searchParams.get('locationId');

        if (!rangeStartStr || !rangeEndStr || !doctorIdStr) {
            return NextResponse.json({ success: false, error: 'Missing standard params' }, { status: 400 });
        }

        const doctorId = parseInt(doctorIdStr, 10);
        const slotDuration = parseInt(slotMinutesStr, 10);

        const startSearch = normalizeToARDate(rangeStartStr);
        const endSearch = normalizeToARDate(rangeEndStr);

        // 2. Traer Configuración del Doctor & Address
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, doctorId), eq(doctors.teamId, teamId))
        });

        if (!doctor?.googleCalendarId) {
            return NextResponse.json({ success: false, error: 'Doctor not configured for calendar.' }, { status: 400 });
        }

        let address;
        if (locationIdStr) {
            address = await db.query.teamAddresses.findFirst({
                where: and(eq(teamAddresses.id, parseInt(locationIdStr, 10)), eq(teamAddresses.teamId, teamId))
            });
        } else {
            address = await db.query.teamAddresses.findFirst({
                where: and(eq(teamAddresses.teamId, teamId))
            });
        }

        if (!address || !address.businessHours) {
            return NextResponse.json({ success: false, error: 'Address/Business hours not configured.' }, { status: 400 });
        }

        const agendaDB = address.businessHours as Record<string, string>;

        // 3. Batch FreeBusy query
        const busyBlocks = await getBusyBlocks(doctor.googleCalendarId, startSearch, endSearch);

        // 4. Batch Local Conflicts query
        const localConflicts = await db.query.appointments.findMany({
            where: and(
                eq(appointments.doctorId, doctorId),
                eq(appointments.status, 'scheduled'),
                lt(appointments.startTime, endSearch),
                gt(appointments.endTime, startSearch)
            )
        });

        let slots: string[] = [];
        let current = new Date(startSearch.getTime());

        // Loop: Check slots in intervals of 30 minutes
        while (new Date(current.getTime() + slotDuration * 60000) <= endSearch) {
            const dateAR = new Date(current.toLocaleString("en-US", { timeZone: TIMEZONE }));
            const dayName = DAY_MAP[dateAR.getDay()];
            const range = agendaDB[dayName];

            if (range && range !== "cerrado") {
                const [openStr, closeStr] = range.split('-');
                const openMin = timeToMin(openStr);
                const closeMin = timeToMin(closeStr);

                const currentMin = getMinutosAR(current);
                const potentialEndMin = currentMin + slotDuration;

                // Rule 1: Horario Comercial
                if (currentMin >= openMin && potentialEndMin <= closeMin) {
                    const potentialEndDate = new Date(current.getTime() + slotDuration * 60000);

                    // Rule 2: FreeBusy en Google Calendar
                    const isBusyGC = isSlotBusy(current, potentialEndDate, busyBlocks);

                    // Rule 3: Conflictos Locales no sincronizados (en Postgres pero no en Calendar)
                    const isBusyLocal = localConflicts.some(local => {
                        return (current < local.endTime && potentialEndDate > local.startTime);
                    });

                    if (!isBusyGC && !isBusyLocal) {
                        slots.push(current.toLocaleString('es-AR', {
                            timeZone: TIMEZONE,
                            weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }));
                    }
                }
            }

            // Movemos de a 30 mins
            current.setMinutes(current.getMinutes() + 30);

            // Limitador de resultados (para no pasar max output tokens al LLM)
            if (slots.length >= 15) break;
        }

        // Return the clean array of slots
        return NextResponse.json({ success: true, count: slots.length, data: slots });

    } catch (error: any) {
        console.error('Error in /slots endpoint:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
