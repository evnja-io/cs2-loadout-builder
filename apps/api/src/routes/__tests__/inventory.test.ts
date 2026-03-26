import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins, seedUser } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../../services/steam-inventory.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/steam-inventory.js')>();
  return {
    ...original,
    fetchCs2Inventory: vi.fn().mockResolvedValue([
      {
        classid: '1', instanceid: '1',
        market_hash_name: 'AK-47 | Redline (Field-Tested)',
        icon_url: 'abc123',
        tags: [{ category: 'Type', internal_name: 'Rifle' }],
      },
    ]),
  };
});

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  await seedUser(testDb.db);
  app = await buildApp({ db: testDb.db, jwtSecret: 'test-secret-32-chars-minimum-len' });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('GET /inventory', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/inventory' });
    expect(res.statusCode).toBe(401);
  });

  it('returns parsed inventory items', async () => {
    const token = app.jwt.sign({ steamId: '76561198000000001' });
    const res = await app.inject({
      method: 'GET', url: '/inventory',
      cookies: { token },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});
