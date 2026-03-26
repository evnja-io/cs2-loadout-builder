import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  app = await buildApp({ db: testDb.db });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('GET /weapons', () => {
  it('returns weapons grouped by category', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.rifles).toBeDefined();
    expect(body.rifles.some((w: { name: string }) => w.name === 'AK-47')).toBe(true);
  });
});

describe('GET /weapons/:defIndex/skins', () => {
  it('returns skins for a weapon', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons/7/skins' });
    expect(res.statusCode).toBe(200);
    const skins = res.json();
    expect(Array.isArray(skins)).toBe(true);
    expect(skins.find((s: { name: string }) => s.name === 'Redline')).toBeDefined();
  });

  it('returns 404 for unknown weapon', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons/9999/skins' });
    expect(res.statusCode).toBe(404);
  });

  it('filters by rarity', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons/7/skins?rarity=classified' });
    expect(res.statusCode).toBe(200);
    const skins = res.json();
    expect(skins.every((s: { rarity: string }) => s.rarity === 'classified')).toBe(true);
  });
});
