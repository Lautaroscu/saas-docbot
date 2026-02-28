import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { doctors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);

        const docs = await db.query.doctors.findMany({
            where: and(eq(doctors.teamId, teamId), eq(doctors.isActive, true)),
            with: {
                services: {
                    with: { service: true }
                }
            }
        });

        return NextResponse.json({ success: true, data: docs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        let encryptedMpToken = null;
        if (body.mpAccessToken) {
            encryptedMpToken = encrypt(body.mpAccessToken);
        }

        const inserted = await db.insert(doctors).values({
            teamId,
            name: body.name,
            specialty: body.specialty,
            googleCalendarId: body.googleCalendarId,
            mpAccessToken: encryptedMpToken,
            mpPublicKey: body.mpPublicKey,
            mpUserId: body.mpUserId,
        }).returning();

        return NextResponse.json({ success: true, data: inserted[0] });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
