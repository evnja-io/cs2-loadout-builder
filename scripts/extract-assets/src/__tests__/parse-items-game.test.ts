import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCatalogueFromJson } from '../parse-items-game.js';

const TMP = join(tmpdir(), 'lb-test-catalogue-' + Date.now());

const WEAPONS = [
  {
    defIndex: 7,
    name: 'AK-47',
    internalName: 'weapon_ak47',
    category: 'rifles',
    modelPath: 'weapons/models/ak47.vmdl',
  },
  {
    defIndex: 507,
    name: 'Karambit',
    internalName: 'weapon_knife_karambit',
    category: 'knives',
    modelPath: 'weapons/models/karambit.vmdl',
  },
];

const SKINS = [
  {
    weaponDefIndex: 7,
    paintKitId: 44,
    kitName: 'aq_ak47_redline',
    name: 'AK-47 | Redline',
    rarity: 'classified',
    finishStyle: 'hydrographic',
    wearMin: 0.1,
    wearMax: 0.45,
    iconPath: null,
    colorA: [0.5, 0.5, 0.5, 1.0] as [number, number, number, number],
    colorB: null,
    colorC: null,
    colorD: null,
    colorWarp: 0,
    phase: 0,
  },
];

beforeAll(async () => {
  await mkdir(TMP, { recursive: true });
  await writeFile(join(TMP, 'weapons_catalogue.json'), JSON.stringify(WEAPONS));
  await writeFile(join(TMP, 'skins_catalogue.json'), JSON.stringify(SKINS));
});

afterAll(async () => {
  await rm(TMP, { recursive: true, force: true });
});

describe('loadCatalogueFromJson', () => {
  it('loads weapons with correct fields', async () => {
    const { weapons } = await loadCatalogueFromJson(TMP);
    const ak = weapons.find(w => w.defIndex === 7);
    expect(ak).toBeDefined();
    expect(ak?.name).toBe('AK-47');
    expect(ak?.category).toBe('rifles');
    expect(ak?.internalName).toBe('weapon_ak47');
  });

  it('loads skins with correct fields', async () => {
    const { skins } = await loadCatalogueFromJson(TMP);
    const skin = skins.find(s => s.paintKitId === 44);
    expect(skin).toBeDefined();
    expect(skin?.name).toBe('AK-47 | Redline');
    expect(skin?.rarity).toBe('classified');
    expect(skin?.finishStyle).toBe('hydrographic');
    expect(skin?.wearMin).toBeCloseTo(0.1);
    expect(skin?.wearMax).toBeCloseTo(0.45);
    expect(skin?.colorA).toEqual([0.5, 0.5, 0.5, 1.0]);
  });

  it('loads knife skins', async () => {
    const { weapons } = await loadCatalogueFromJson(TMP);
    const karambit = weapons.find(w => w.defIndex === 507);
    expect(karambit).toBeDefined();
    expect(karambit?.category).toBe('knives');
  });
});
