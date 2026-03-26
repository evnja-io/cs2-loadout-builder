import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../../services/prices.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/prices.js')>();
  return {
    ...original,
    getPrices: vi.fn().mockResolvedValue([
      { skinId: 1, source: 'steam', price: 5.23, currency: 'USD', listingUrl: null, updatedAt: new Date().toISOString() },
    ]),
  };
});

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  app = await buildApp({ db: testDb.db });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('GET /prices', () => {
  it('returns price data for a skin', async () => {
    const res = await app.inject({ method: 'GET', url: '/prices?skinId=1' });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].source).toBe('steam');
  });

  it('returns 400 for invalid skinId', async () => {
    const res = await app.inject({ method: 'GET', url: '/prices?skinId=abc' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unknown skin', async () => {
    const res = await app.inject({ method: 'GET', url: '/prices?skinId=9999' });
    expect(res.statusCode).toBe(404);
  });
});
