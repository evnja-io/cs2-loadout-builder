import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins, seedUser } from '../../test-utils/fixtures.js';
import { weapons, loadouts, loadoutSlots } from '../schema.js';

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
}, 60_000);

afterAll(async () => { await testDb.cleanup(); });

describe('DB Schema', () => {
  it('can insert and retrieve weapons', async () => {
    await seedWeapons(testDb.db);
    const rows = await testDb.db.select().from(weapons);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.find(w => w.defIndex === 7)?.name).toBe('AK-47');
  });

  it('enforces unique slot per weapon per loadout', async () => {
    const steamId = await seedUser(testDb.db);
    await seedSkins(testDb.db);

    const [loadout] = await testDb.db.insert(loadouts)
      .values({ userId: steamId, name: 'Test Loadout' })
      .returning();

    await testDb.db.insert(loadoutSlots).values({
      loadoutId: loadout!.id, weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 500, statTrak: false,
    });

    await expect(
      testDb.db.insert(loadoutSlots).values({
        loadoutId: loadout!.id, weaponDefIndex: 7, skinId: 2, wear: 0.2, seed: 300, statTrak: false,
      })
    ).rejects.toThrow();
  });
});
