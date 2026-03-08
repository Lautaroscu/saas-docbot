import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.BASE_URL}/api/auth/google/callback`;
const BASE_URL = process.env.BASE_URL!;

// GET /api/auth/google/callback
// Google redirects here after the user grants/denies consent.
// Exchanges the code for tokens and saves them to the doctor row.
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // doctorId
    const error = searchParams.get('error');

    // User denied — redirect back to the doctor page with an error flag
    if (error || !code || !state) {
        return NextResponse.redirect(`${BASE_URL}/management/doctor/${state ?? ''}?calendar=error`);
    }

    const docId = parseInt(state, 10);

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.refresh_token) {
            // This happens if the user already granted access before without prompt=consent
            return NextResponse.redirect(`${BASE_URL}/management/doctor/${docId}?calendar=no_refresh_token`);
        }

        // Fetch the primary calendar ID using the access token
        let calendarId = 'primary';
        try {
            const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            const calData = await calRes.json();
            if (calData.id) calendarId = calData.id;
        } catch (_) {
            // Non-fatal — fallback to 'primary'
        }

        // Save to DB — refresh token encrypted at rest (AES-256-CBC, same key as MP tokens)
        await db.update(doctors)
            .set({
                googleRefreshToken: encrypt(tokens.refresh_token),
                googleCalendarId: calendarId,
                calendarStatus: 'connected',
            })
            .where(eq(doctors.id, docId));

        return NextResponse.redirect(`${BASE_URL}/management/doctor/${docId}?calendar=connected`);
    } catch (err: any) {
        console.error('[Google OAuth Callback] Error:', err);
        return NextResponse.redirect(`${BASE_URL}/management/doctor/${docId}?calendar=error`);
    }
}
