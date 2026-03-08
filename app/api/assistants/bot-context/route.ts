import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { assistants, apiKeys } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/assistants/bot-context
//
// Public endpoint intended for n8n. Accepts EITHER:
//   - ?departmentId=<id>    (along with x-team-id header)
//   - OR an active API key in the Authorization header (Bearer) or x-api-key header
//
// Returns the assembled system prompt string. No session required — n8n uses an API key.

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const apiKeyHeader = request.headers.get('x-api-key');
        const rawApiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (apiKeyHeader ?? null);

        let teamId: number | null = null;
        let departmentId: number | null = null;

        if (rawApiKey) {
            // Resolve team (and optionally department) from the API key
            const key = await db.query.apiKeys.findFirst({
                where: and(eq(apiKeys.apiKey, rawApiKey), eq(apiKeys.isActive, true))
            });
            if (!key) {
                return NextResponse.json({ success: false, error: 'Invalid API Key' }, { status: 401 });
            }
            teamId = key.teamId;
            departmentId = key.departmentId ?? null;
        } else {
            // Allow x-team-id header + departmentId query param (Dashboard / dev use)
            const teamIdStr = request.headers.get('x-team-id');
            if (!teamIdStr) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            teamId = parseInt(teamIdStr, 10);
        }

        // departmentId can also come from the query string
        const { searchParams } = new URL(request.url);
        const queryDeptId = searchParams.get('departmentId');
        if (!departmentId && queryDeptId) {
            departmentId = parseInt(queryDeptId, 10);
        }

        if (!departmentId) {
            return NextResponse.json({ success: false, error: 'departmentId is required' }, { status: 400 });
        }

        const assistant = await db.query.assistants.findFirst({
            where: and(
                eq(assistants.teamId, teamId!),
                eq(assistants.departmentId, departmentId)
            )
        });

        if (!assistant) {
            return NextResponse.json({ success: false, error: 'Assistant not configured for this department' }, { status: 404 });
        }

        // Assemble the safe, injection-resistant prompt string
        const assembledPrompt = `${assistant.persona} Tu tono de respuesta debe ser ${assistant.tone}. Saluda siempre diciendo: ${assistant.initialGreeting}`;

        return NextResponse.json({
            success: true,
            data: {
                assistantId: assistant.id,
                name: assistant.name,
                prompt: assembledPrompt,
                initialGreeting: assistant.initialGreeting,
                temperature: assistant.temperature,
                isActive: assistant.isActive,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
