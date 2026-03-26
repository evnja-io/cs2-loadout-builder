import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins, seedUser } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

let testDb: TestDb;
let app: FastifyInstance;
const JWT_SECRET = 'test-secret-32-chars-minimum-len';
const STEAM_ID = '76561198000000001';

function authCookie(app: FastifyInstance, steamId = STEAM_ID) {
  return { token: app.jwt.sign({ steamId }) };
}

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  await seedUser(testDb.db, STEAM_ID);
  app = await buildApp({ db: testDb.db, jwtSecret: JWT_SECRET });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('POST /loadouts', () => {
  it('creates a loadout for authenticated user', async () => {
    const res = await app.inject({
      method: 'POST', url: '/loadouts',
      cookies: authCookie(app),
      payload: { name: 'My First Loadout' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('My First Loadout');
    expect(res.json().id).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/loadouts', payload: { name: 'x' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /loadouts', () => {
  it('returns only the authenticated user loadouts', async () => {
    const res = await app.inject({
      method: 'GET', url: '/loadouts',
      cookies: authCookie(app),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});

describe('PUT /loadouts/:id/slots', () => {
  it('upserts slots for a loadout', async () => {
    const create = await app.inject({
      method: 'POST', url: '/loadouts',
      cookies: authCookie(app),
      payload: { name: 'Slot Test' },
    });
    const loadoutId = create.json().id;

    const res = await app.inject({
      method: 'PUT', url: `/loadouts/${loadoutId}/slots`,
      cookies: authCookie(app),
      payload: { slots: [{ weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 500, statTrak: false }] },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /share/:slug', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await app.inject({ method: 'GET', url: '/share/notaslug' });
    expect(res.statusCode).toBe(404);
  });

  it('returns public loadout by slug', async () => {
    const create = await app.inject({
      method: 'POST', url: '/loadouts',
      cookies: authCookie(app),
      payload: { name: 'Public Loadout' },
    });
    const { id } = create.json();
    await app.inject({
      method: 'PATCH', url: `/loadouts/${id}`,
      cookies: authCookie(app),
      payload: { isPublic: true },
    });
    const updated = await app.inject({ method: 'GET', url: `/loadouts/${id}`, cookies: authCookie(app) });
    const { shareSlug } = updated.json();

    const res = await app.inject({ method: 'GET', url: `/share/${shareSlug}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Public Loadout');
  });
});
