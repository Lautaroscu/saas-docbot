import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/context';
import { db } from '@/lib/db/drizzle';
import { doctors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = `${process.env.BASE_URL}/api/auth/google/callback`;

// GET /api/auth/google/initiate/[doctorId]
// Redirects the user to Google's OAuth2 consent page.
// State = doctorId (used in callback to know which doctor to update).
export async function GET(
    request: Request,
    props: { params: Promise<{ doctorId: string }> }
) {
    try {
        const context = await getSessionContext(request);
        if ('error' in context) return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });

        if (!GOOGLE_CLIENT_ID) {
            return NextResponse.json({ success: false, error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env' }, { status: 500 });
        }

        const { doctorId } = await props.params;

        // Verify the doctor belongs to this team before starting the flow
        const doctor = await db.query.doctors.findFirst({
            where: and(eq(doctors.id, parseInt(doctorId, 10)), eq(doctors.teamId, context.teamId))
        });
        if (!doctor) return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });

        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: [
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.events'
            ].join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state: doctorId,
        });

        return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
