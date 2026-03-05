import { Queue } from 'bullmq';
import redis from '@/lib/redis';

// Nombre estandar
export const OUTBOUND_QUEUE_NAME = 'whatsapp-outbound-queue';

export const outboundQueue = new Queue(OUTBOUND_QUEUE_NAME, {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1500, // Reintento si Meta responde un 429
        },
        removeOnComplete: true,
    }
});
