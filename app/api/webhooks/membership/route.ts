import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        }

        const body = await req.json();

        console.log('Received MP Webhook:', body);

        // When a subscription is updated, MP sends action like "created", "updated"
        // Also we need to fetch the preapproval details because the webhook only sends the ID.
        // Or if the body has the external_reference directly, we can use it. But usually it only sends type and "data.id".

        // For subscriptions, MP usually sends type "preapproval" or "subscription_preapproval"
        const isPreapproval = body.type === 'subscription_preapproval' || body.action?.includes('preapproval');

        let preapprovalId = body.data?.id;

        if (!preapprovalId) {
            return NextResponse.json({ message: 'No preapproval ID in payload' }, { status: 200 });
        }

        // Verify authenticity by fetching from MP API directly
        const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
            headers: {
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
            }
        });

        if (!mpRes.ok) {
            console.error('Failed to fetch preapproval from MP', await mpRes.text());
            return NextResponse.json({ error: 'Invalid preapproval ID' }, { status: 400 });
        }

        const preapproval = await mpRes.json();
        const externalReference = preapproval.external_reference;

        if (!externalReference) {
            return NextResponse.json({ error: 'No external_reference found in preapproval' }, { status: 400 });
        }

        // Find the team
        const teamRecord = await db.query.teams.findFirst({
            where: eq(teams.id, parseInt(externalReference, 10))
        });

        if (!teamRecord) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        // Secure token validation
        if (teamRecord.webhookToken !== token) {
            console.error('Webhook token mismatch! Possible attack attempt.');
            return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
        }

        // Update the subscription status
        const status = preapproval.status; // 'authorized', 'paused', 'cancelled'

        await db.update(teams)
            .set({
                subscriptionStatus: status,
                mpPreapprovalId: preapproval.id,
                updatedAt: new Date()
            })
            .where(eq(teams.id, teamRecord.id));

        console.log(`Updated team ${teamRecord.id} subscription status to ${status}`);

        return NextResponse.json({ success: true, status });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
