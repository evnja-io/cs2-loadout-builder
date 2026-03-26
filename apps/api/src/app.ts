import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './db/schema.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { weaponRoutes } from './routes/weapons.js';
import { loadoutRoutes } from './routes/loadouts.js';
import { inventoryRoutes } from './routes/inventory.js';
import { priceRoutes } from './routes/prices.js';

export interface AppOptions {
  db?: PostgresJsDatabase<typeof schema>;
  jwtSecret?: string;
  webUrl?: string;
  logger?: boolean;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(cookie);
  await app.register(cors, {
    origin: opts.webUrl ?? process.env['WEB_URL'] ?? [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    credentials: true,
  });
  const jwtSecret = opts.jwtSecret ?? process.env['JWT_SECRET'];
  if (!jwtSecret) throw new Error('JWT_SECRET is required');
  await app.register(jwt, {
    secret: jwtSecret,
    cookie: { cookieName: 'token', signed: false },
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  await app.register(authPlugin);

  const db = opts.db ?? (await import('./db/index.js')).db;
  await app.register(authRoutes, {
    db,
    steamApiKey: process.env['STEAM_API_KEY'] ?? '',
    apiUrl: process.env['API_URL'] ?? 'http://localhost:3001',
    webUrl: opts.webUrl ?? process.env['WEB_URL'] ?? 'http://localhost:5173',
  });

  await app.register(weaponRoutes, { db });
  await app.register(loadoutRoutes, { db });
  await app.register(inventoryRoutes, { db });
  await app.register(priceRoutes, { db });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
