import type { Db } from '../db/index.js';
import { weapons, skins, users } from '../db/schema.js';

export async function seedWeapons(db: Db) {
  await db.insert(weapons).values([
    { defIndex: 7, name: 'AK-47', category: 'rifles', modelPath: null, iconPath: null },
    { defIndex: 16, name: 'M4A4', category: 'rifles', modelPath: null, iconPath: null },
    { defIndex: 1, name: 'Desert Eagle', category: 'pistols', modelPath: null, iconPath: null },
    { defIndex: 507, name: 'Karambit', category: 'knives', modelPath: null, iconPath: null },
  ]);
}

export async function seedSkins(db: Db) {
  await db.insert(skins).values([
    {
      id: 1, weaponDefIndex: 7, paintKitId: 44, name: 'Redline',
      rarity: 'classified', finishStyle: 'hydrographic',
      patternTexture: null, roughnessTexture: null, iconPath: null,
      colorA: null, colorB: null, colorC: null, colorD: null,
      colorWarp: 0, phase: 0,
      wearMin: 0.1, wearMax: 0.45,
    },
    {
      id: 2, weaponDefIndex: 7, paintKitId: 675, name: 'Asiimov',
      rarity: 'covert', finishStyle: 'hydrographic',
      patternTexture: null, roughnessTexture: null, iconPath: null,
      colorA: null, colorB: null, colorC: null, colorD: null,
      colorWarp: 0, phase: 0,
      wearMin: 0.18, wearMax: 1.0,
    },
  ]);
}

export async function seedUser(db: Db, steamId = '76561198000000001') {
  await db.insert(users).values({
    steamId,
    username: 'TestPlayer',
    avatar: 'https://avatars.steamstatic.com/test.jpg',
    profileUrl: 'https://steamcommunity.com/id/test',
  });
  return steamId;
}
