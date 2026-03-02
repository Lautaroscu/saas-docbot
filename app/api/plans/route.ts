import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
    try {
        const activePlans = await db.query.plans.findMany({
            where: eq(plans.isActive, true)
        });

        return NextResponse.json(activePlans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }
}
