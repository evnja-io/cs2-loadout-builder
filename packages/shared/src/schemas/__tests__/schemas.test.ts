import { describe, it, expect } from 'vitest';
import {
  WeaponSchema,
  SkinSchema,
  UserSchema,
  UpsertSlotSchema,
} from '../../index.js';

describe('WeaponSchema', () => {
  it('accepts valid weapon', () => {
    const result = WeaponSchema.safeParse({
      defIndex: 7, name: 'AK-47', category: 'rifles', modelPath: null, iconPath: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown category', () => {
    const result = WeaponSchema.safeParse({
      defIndex: 7, name: 'AK-47', category: 'bazooka', modelPath: null, iconPath: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('SkinSchema', () => {
  it('rejects wear out of range', () => {
    const result = SkinSchema.safeParse({
      id: 1, weaponDefIndex: 7, paintKitId: 44, name: 'Redline',
      rarity: 'classified', finishStyle: 'hydrographic',
      patternTexture: null, colorTexture: null, normalTexture: null, roughnessTexture: null,
      wearMin: -0.1, wearMax: 0.45,
    });
    expect(result.success).toBe(false);
  });
});

describe('UpsertSlotSchema', () => {
  it('rejects seed out of range', () => {
    const result = UpsertSlotSchema.safeParse({
      weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 0, statTrak: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('UserSchema', () => {
  it('rejects non-17-digit steamId', () => {
    const result = UserSchema.safeParse({
      steamId: '123', username: 'test', avatar: 'https://a.com/a.png',
      profileUrl: 'https://steamcommunity.com/id/test', createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
