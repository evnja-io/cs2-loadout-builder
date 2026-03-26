import type { InventoryItem } from '@lb/shared';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';
import { skins } from '../db/schema.js';
import { inArray } from 'drizzle-orm';

type Db = PostgresJsDatabase<typeof schema>;

interface SteamDescription {
  classid: string;
  instanceid: string;
  market_hash_name: string;
  icon_url: string;
  tags: Array<{ category: string; internal_name: string }>;
}

export async function fetchCs2Inventory(steamId: string): Promise<SteamDescription[]> {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=500`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Steam inventory error: ${res.status}`);
  const data = await res.json() as { assets?: unknown[]; descriptions?: SteamDescription[] };
  return data.descriptions ?? [];
}

const WEAR_MAP: Record<string, number> = {
  'Factory New': 0.07,
  'Minimal Wear': 0.15,
  'Field-Tested': 0.38,
  'Well-Worn': 0.45,
  'Battle-Scarred': 0.75,
};

export async function parseInventoryItems(
  steamDescriptions: SteamDescription[],
  db: Db
): Promise<InventoryItem[]> {
  const results: InventoryItem[] = [];

  // Extract all skin part names first to avoid N+1 queries
  const descWithParts = steamDescriptions.map(desc => {
    const wearMatch = desc.market_hash_name.match(/\(([^)]+)\)$/);
    const wear = wearMatch ? (WEAR_MAP[wearMatch[1]!] ?? 0.5) : 0.5;
    const weaponSkinName = desc.market_hash_name.replace(/ \([^)]+\)$/, '');
    const skinPartName = weaponSkinName.split(' | ')[1] ?? '';
    return { desc, wear, skinPartName };
  }).filter(item => item.skinPartName !== '');

  if (descWithParts.length === 0) return results;

  const partNames = descWithParts.map(item => item.skinPartName);
  const skinRows = await db.select().from(skins).where(inArray(skins.name, partNames));
  const skinMap = new Map<string, typeof skins.$inferSelect>(
    skinRows.map(row => [row.name, row])
  );

  for (const { desc, wear, skinPartName } of descWithParts) {
    const skinRow = skinMap.get(skinPartName);
    if (!skinRow) continue;

    results.push({
      weaponDefIndex: skinRow.weaponDefIndex,
      skinId: skinRow.id,
      wear,
      // NOTE: seed=500 is intentional — Steam's inventory API does not expose the
      // pattern seed. Users can manually adjust the seed in the builder after import.
      seed: 500,
      statTrak: desc.market_hash_name.startsWith('StatTrak™'),
      iconUrl: `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}`,
      marketHashName: desc.market_hash_name,
    });
  }

  return results;
}
