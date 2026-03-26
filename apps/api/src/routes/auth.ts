import type { FastifyInstance } from 'fastify';
import { createRelyingParty, getSteamAuthUrl, validateSteamCallback, fetchSteamProfile } from '../services/steam-auth.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';

export async function authRoutes(
  app: FastifyInstance,
  opts: { db: PostgresJsDatabase<typeof schema>; steamApiKey: string; apiUrl: string; webUrl: string }
) {
  const relyingParty = createRelyingParty(opts.apiUrl);

  app.get('/auth/steam', async (_request, reply) => {
    const url = await getSteamAuthUrl(relyingParty);
    return reply.redirect(url);
  });

  app.get('/auth/steam/callback', async (request, reply) => {
    const fullUrl = `${opts.apiUrl}${request.url}`;
    let steamId: string;
    let profile: Awaited<ReturnType<typeof fetchSteamProfile>>;
    try {
      steamId = await validateSteamCallback(relyingParty, fullUrl);
      profile = await fetchSteamProfile(steamId, opts.steamApiKey);
    } catch (err) {
      app.log.error(err, 'Steam auth failed');
      return reply.redirect(`${opts.webUrl}/?auth_error=1`);
    }

    await opts.db.insert(users).values({
      steamId: profile.steamId,
      username: profile.username,
      avatar: profile.avatar,
      profileUrl: profile.profileUrl,
    }).onConflictDoUpdate({
      target: users.steamId,
      set: { username: profile.username, avatar: profile.avatar },
    });

    const token = app.jwt.sign({ steamId: profile.steamId }, { expiresIn: '7d' });
    void reply.setCookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.redirect(`${opts.webUrl}/builder`);
  });

  app.get('/auth/me', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [user] = await opts.db.select().from(users).where(eq(users.steamId, request.userId));
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });
}
