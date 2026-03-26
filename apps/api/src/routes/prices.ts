import type { FastifyInstance } from 'fastify';
import { getPrices } from '../services/prices.js';
import { skins } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';
import { PriceSourceSchema } from '@lb/shared';

type Db = PostgresJsDatabase<typeof schema>;

export async function priceRoutes(app: FastifyInstance, opts: { db: Db }) {
  app.get<{ Querystring: { skinId: string; sources?: string } }>('/prices', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const skinId = parseInt(request.query.skinId, 10);
    if (isNaN(skinId)) return reply.status(400).send({ error: 'Invalid skinId' });

    const rawSources = (request.query.sources ?? 'steam,csfloat,bitskin').split(',');
    const sources = rawSources
      .map(s => PriceSourceSchema.safeParse(s.trim()))
      .filter((r): r is { success: true; data: ReturnType<typeof PriceSourceSchema.parse> } => r.success)
      .map(r => r.data);

    const [skin] = await opts.db.select().from(skins).where(eq(skins.id, skinId));
    if (!skin) return reply.status(404).send({ error: 'Skin not found' });

    return getPrices(skinId, sources, opts.db, skin.name);
  });
}
