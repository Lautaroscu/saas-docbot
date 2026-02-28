import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams, assistants, teamAddresses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);

        const teamConfig = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });

        // Usually we want the assistant and address too
        const assistantConfig = await db.query.assistants.findFirst({
            where: eq(assistants.teamId, teamId)
        });

        const addressConfig = await db.query.teamAddresses.findFirst({
            where: eq(teamAddresses.teamId, teamId)
        });

        return NextResponse.json({
            success: true,
            data: {
                team: teamConfig,
                assistant: assistantConfig,
                address: addressConfig
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const teamIdStr = request.headers.get('x-team-id');
        if (!teamIdStr) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const teamId = parseInt(teamIdStr, 10);
        const body = await request.json();

        // Partial updates based on sent objects
        if (body.name) {
            await db.update(teams).set({ name: body.name }).where(eq(teams.id, teamId));
        }

        if (body.assistant) {
            await db.update(assistants).set(body.assistant).where(eq(assistants.teamId, teamId));
        }

        if (body.address) {
            await db.update(teamAddresses).set(body.address).where(eq(teamAddresses.teamId, teamId));
        }

        return NextResponse.json({ success: true, data: 'Config updated' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
