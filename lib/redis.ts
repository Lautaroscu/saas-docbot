import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
    redisClient: Redis | undefined;
};

// Se usa redisUrl inyectada por Docker compose de ser posible, o localhost en dev puro.
// En producción, es altamente recomendable usar connection string con auth.
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Usamos patrón singleton en global object para evitar 
// HMR (Hot Module Replacement) múltiples conexiones en DEV
export const redis = globalForRedis.redisClient || new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Requisito de BullMQ: maxRetriesPerRequest debe ser null
});

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redisClient = redis;
}

export default redis;
