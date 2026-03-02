import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, getTeamForUser } from '@/lib/db/queries';

export async function POST(req: Request) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planSlug } = await req.json();

        if (!planSlug) {
            return NextResponse.json({ error: 'Missing planSlug' }, { status: 400 });
        }

        const plan = await db.query.plans.findFirst({
            where: eq(plans.slug, planSlug)
        });

        if (!plan || !plan.isActive) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const team = await getTeamForUser();

        if (!team) {
            return NextResponse.json({ error: 'User does not belong to a team' }, { status: 403 });
        }

        if (team.subscriptionStatus === 'active' || team.subscriptionStatus === 'authorized') {
            return NextResponse.json(
                { error: 'Team already has an active subscription. Please cancel it first if you want to upgrade/downgrade.' },
                { status: 400 }
            );
        }

        const backUrl = `${process.env.BASE_URL}/dashboard`;

        const response = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                preapproval_plan_id: plan.mpPlanId,
                payer_email: team.billingEmail || user.email,
                back_url: backUrl,
                reason: `Suscripción - ${plan.name}`,
                external_reference: team.id.toString(),
                status: 'pending'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('MercadoPago Error:', data);
            return NextResponse.json({ error: 'Failed to create subscription in Mercado Pago' }, { status: 500 });
        }

        return NextResponse.json({ init_point: data.init_point });
    } catch (error) {
        console.error('Membership subscribe error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
