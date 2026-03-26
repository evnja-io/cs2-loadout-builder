import type { FastifyInstance } from 'fastify';
import { fetchCs2Inventory, parseInventoryItems } from '../services/steam-inventory.js';
import { createCache } from '../services/cache.js';
import type { InventoryItem } from '@lb/shared';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';

type Db = PostgresJsDatabase<typeof schema>;

const inventoryCache = createCache<InventoryItem[]>(5 * 60 * 1000); // 5 min TTL

export async function inventoryRoutes(app: FastifyInstance, opts: { db: Db }) {
  app.get('/inventory', {
    config: { rateLimit: { max: 2, timeWindow: '30s' } },
  }, async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });

    const cached = inventoryCache.get(request.userId);
    if (cached) return cached;

    const descriptions = await fetchCs2Inventory(request.userId);
    const items = await parseInventoryItems(descriptions, opts.db);
    inventoryCache.set(request.userId, items);
    return items;
  });
}
