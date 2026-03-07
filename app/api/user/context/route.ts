import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/context';

export async function GET(request: Request) {
    const context = await getSessionContext(request);

    if ('error' in context) {
        return NextResponse.json({ success: false, error: context.error }, { status: context.status as number });
    }

    return NextResponse.json({ success: true, data: context });
}
