import { google } from 'googleapis';

const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || '';

// Configurar el auth client de Google con Service Account
export const getCalendarAuth = () => {
    return new google.auth.JWT({
        email: GOOGLE_CLIENT_EMAIL,
        key: GOOGLE_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    });
};

export const calendar = google.calendar({ version: 'v3' });

// ==========================================
// Time y Timezones (Lógica tipo n8n - AR)
// ==========================================

export const TIMEZONE = 'America/Argentina/Buenos_Aires';
export const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const timeToMin = (timeStr: string): number => {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
};

export const getMinutosAR = (date: Date): number => {
    const timeStr = date.toLocaleTimeString('en-GB', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    return timeToMin(timeStr);
};

export const normalizeToARDate = (isoString: string): Date => {
    const str = isoString.includes('-03:00')
        ? isoString
        : isoString.includes('Z')
            ? isoString.replace('Z', '-03:00')
            : `${isoString}-03:00`;
    return new Date(str);
};

// ==========================================
// FreeBusy Query
// ==========================================

export async function getBusyBlocks(calendarId: string, timeMin: Date, timeMax: Date) {
    const auth = getCalendarAuth();

    try {
        const response = await calendar.freebusy.query({
            auth,
            requestBody: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                timeZone: TIMEZONE,
                items: [{ id: calendarId }]
            }
        });

        const calendars = response.data.calendars;
        if (!calendars || !calendars[calendarId]) return [];
        return calendars[calendarId].busy || [];
    } catch (error) {
        console.error('Error fetching freebusy:', error);
        // Si hay error, asumimos que no pudimos validar y podríamos considerarlo "bloqueado" por seguridad, o lanzar el error.
        throw new Error('Error de conexión con Google Calendar.');
    }
}

// Verifica si un slot de tiempo propuesto choca con algun evento busy de google (o citas locales).
export const isSlotBusy = (
    currentStart: Date,
    currentEnd: Date,
    busyBlocks: { start?: string | null, end?: string | null }[]
): boolean => {
    return busyBlocks.some(block => {
        if (!block.start || !block.end) return false;
        const eStart = new Date(block.start);
        const eEnd = new Date(block.end);
        // Lógica de solapamiento: empieza antes de que el otro termine Y termina después de que el otro empieza
        return (currentStart < eEnd && currentEnd > eStart);
    });
}
