import { db } from '@/lib/db/drizzle';
import { assistants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const whatsappService = {
    async sendText(phone: string, text: string, teamId: number) {
        const config = await db.query.assistants.findFirst({
            where: eq(assistants.teamId, teamId)
        });

        if (!config) {
            console.error(`WhatsappService: No assistant config found for teamId: ${teamId}`);
            return false;
        }

        const apiUrl = process.env.WA_API_URL;
        if (!apiUrl) {
            console.warn('WhatsappService: WA_API_URL environment variable is not set');
        }

        const token = (config as any).waToken || config.waVerifyToken;

        const response = await fetch(`${apiUrl}/send-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ number: phone, text: text })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`WhatsappService: Failed to send message to ${phone}:`, response.status, errorText);
        }

        return response.ok;
    }
};
