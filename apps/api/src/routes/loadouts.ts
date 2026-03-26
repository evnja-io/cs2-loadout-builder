import type { FastifyInstance } from 'fastify';
import { loadouts, loadoutSlots, loadoutLikes } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { BulkSlotsSchema, CreateLoadoutSchema, UpdateLoadoutSchema } from '@lb/shared';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';

type Db = PostgresJsDatabase<typeof schema>;

async function generateUniqueSlug(db: Db): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const slug = nanoid(8);
    const [existing] = await db.select().from(loadouts).where(eq(loadouts.shareSlug, slug));
    if (!existing) return slug;
  }
  throw new Error('Could not generate unique slug after 3 attempts');
}

export async function loadoutRoutes(app: FastifyInstance, opts: { db: Db }) {
  const { db } = opts;

  app.get('/loadouts', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    return db.select().from(loadouts).where(eq(loadouts.userId, request.userId));
  });

  app.post<{ Body: { name: string } }>('/loadouts', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const body = CreateLoadoutSchema.parse(request.body);
    const [loadout] = await db.insert(loadouts)
      .values({ userId: request.userId, name: body.name })
      .returning();
    return reply.status(201).send(loadout);
  });

  app.get<{ Params: { id: string } }>('/loadouts/:id', async (request, reply) => {
    const [loadout] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!loadout) return reply.status(404).send({ error: 'Not found' });
    if (!loadout.isPublic && loadout.userId !== request.userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const slots = await db.select().from(loadoutSlots).where(eq(loadoutSlots.loadoutId, loadout.id));
    return { ...loadout, slots };
  });

  app.patch<{ Params: { id: string }; Body: unknown }>('/loadouts/:id', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const body = UpdateLoadoutSchema.parse(request.body);
    const [existing] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    if (existing.userId !== request.userId) return reply.status(403).send({ error: 'Forbidden' });

    const setValues = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
      updatedAt: new Date(),
      ...(body.isPublic && !existing.shareSlug ? { shareSlug: await generateUniqueSlug(db) } : {}),
    };

    const [updated] = await db.update(loadouts).set(setValues)
      .where(eq(loadouts.id, request.params.id)).returning();
    return updated;
  });

  app.delete<{ Params: { id: string } }>('/loadouts/:id', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [existing] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    if (existing.userId !== request.userId) return reply.status(403).send({ error: 'Forbidden' });
    await db.delete(loadouts).where(eq(loadouts.id, request.params.id));
    return reply.status(204).send();
  });

  app.put<{ Params: { id: string }; Body: unknown }>('/loadouts/:id/slots', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [loadout] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!loadout) return reply.status(404).send({ error: 'Not found' });
    if (loadout.userId !== request.userId) return reply.status(403).send({ error: 'Forbidden' });

    const { slots } = BulkSlotsSchema.parse(request.body);
    await db.delete(loadoutSlots).where(eq(loadoutSlots.loadoutId, loadout.id));
    if (slots.length > 0) {
      await db.insert(loadoutSlots).values(slots.map(s => ({ ...s, loadoutId: loadout.id })));
    }
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/loadouts/:id/like', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [loadout] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!loadout?.isPublic) return reply.status(404).send({ error: 'Not found' });

    const inserted = await db.insert(loadoutLikes)
      .values({ userId: request.userId, loadoutId: loadout.id })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      // was unliked, now liked
      await db.update(loadouts).set({ likesCount: sql`${loadouts.likesCount} + 1` }).where(eq(loadouts.id, loadout.id));
      return { liked: true };
    } else {
      // already liked, so unlike
      await db.delete(loadoutLikes).where(and(eq(loadoutLikes.userId, request.userId), eq(loadoutLikes.loadoutId, loadout.id)));
      await db.update(loadouts).set({ likesCount: sql`${loadouts.likesCount} - 1` }).where(eq(loadouts.id, loadout.id));
      return { liked: false };
    }
  });

  app.get<{ Params: { slug: string } }>('/share/:slug', async (request, reply) => {
    const [loadout] = await db.select().from(loadouts)
      .where(and(eq(loadouts.shareSlug, request.params.slug), eq(loadouts.isPublic, true)));
    if (!loadout) return reply.status(404).send({ error: 'Not found' });
    const slots = await db.select().from(loadoutSlots).where(eq(loadoutSlots.loadoutId, loadout.id));
    return { ...loadout, slots };
  });

  app.get<{ Params: { steamId: string } }>('/users/:steamId/loadouts', async (request) => {
    return db.select().from(loadouts)
      .where(and(eq(loadouts.userId, request.params.steamId), eq(loadouts.isPublic, true)));
  });
}
