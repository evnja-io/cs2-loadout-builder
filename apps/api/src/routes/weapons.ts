import type { FastifyInstance } from 'fastify';
import { weapons, skins } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';

type Db = PostgresJsDatabase<typeof schema>;

export async function weaponRoutes(app: FastifyInstance, opts: { db: Db }) {
  app.get('/weapons', async () => {
    const rows = await opts.db.select().from(weapons);
    return rows.reduce<Record<string, typeof rows>>((acc, w) => {
      (acc[w.category] ??= []).push(w);
      return acc;
    }, {});
  });

  app.get<{ Params: { defIndex: string }; Querystring: { rarity?: string } }>(
    '/weapons/:defIndex/skins',
    async (request, reply) => {
      const defIndex = parseInt(request.params.defIndex, 10);
      const [weapon] = await opts.db.select().from(weapons).where(eq(weapons.defIndex, defIndex));
      if (!weapon) return reply.status(404).send({ error: 'Weapon not found' });

      const conditions = [eq(skins.weaponDefIndex, defIndex)];
      if (request.query.rarity) {
        conditions.push(eq(skins.rarity, request.query.rarity));
      }

      const rows = await opts.db.select().from(skins).where(and(...conditions));
      return rows.map(s => ({
        ...s,
        colorA: s.colorA ? JSON.parse(s.colorA) : null,
        colorB: s.colorB ? JSON.parse(s.colorB) : null,
        colorC: s.colorC ? JSON.parse(s.colorC) : null,
        colorD: s.colorD ? JSON.parse(s.colorD) : null,
      }));
    }
  );
}
