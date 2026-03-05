import { Queue } from 'bullmq';
import redis from '@/lib/redis';

// Nombre estandar de la cola
export const INBOUND_QUEUE_NAME = 'whatsapp-inbound-queue';

// Exportar la instancia de la cola Singleton
export const inboundQueue = new Queue(INBOUND_QUEUE_NAME, {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 3,                 // Tolerancia a fallos por caídas casuales
        backoff: {
            type: 'exponential',       // Reintros escalonados
            delay: 2000,
        },
        removeOnComplete: true,      // No acumular basura en Redis
        removeOnFail: false          // Mantener jobs fallidos para inspección manual (DLQ)
    }
});
