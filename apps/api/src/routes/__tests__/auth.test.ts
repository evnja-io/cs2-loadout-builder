import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../../services/steam-auth.js', () => ({
  createRelyingParty: vi.fn(() => ({})),
  getSteamAuthUrl: vi.fn().mockResolvedValue('https://steamcommunity.com/openid/login?test=1'),
  validateSteamCallback: vi.fn().mockResolvedValue('76561198000000001'),
  fetchSteamProfile: vi.fn().mockResolvedValue({
    steamId: '76561198000000001',
    username: 'TestPlayer',
    avatar: 'https://avatars.steamstatic.com/test.jpg',
    profileUrl: 'https://steamcommunity.com/id/test',
  }),
}));

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  app = await buildApp({ db: testDb.db, jwtSecret: 'test-secret-32-chars-minimum-len', webUrl: 'http://localhost:5173' });
}, 60_000);

afterAll(async () => {
  await app.close();
  await testDb.cleanup();
});

describe('GET /auth/steam', () => {
  it('redirects to Steam OpenID URL', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/steam' });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('steamcommunity.com');
  });
});

describe('GET /auth/steam/callback', () => {
  it('creates user and sets JWT cookie', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/steam/callback?openid.mode=id_res' });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('http://localhost:5173/builder');
    expect(res.cookies.find(c => c.name === 'token')).toBeDefined();
  });
});

describe('POST /auth/logout', () => {
  it('clears the token cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    const tokenCookie = res.cookies.find(c => c.name === 'token');
    // Cookie should be cleared (maxAge=0 or expires in the past)
    expect(tokenCookie?.value ?? '').toBe('');
  });
});

describe('GET /auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns user profile when authenticated', async () => {
    await app.inject({ method: 'GET', url: '/auth/steam/callback?openid.mode=id_res' });
    const token = app.jwt.sign({ steamId: '76561198000000001' });

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { token },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().steamId).toBe('76561198000000001');
  });
});
