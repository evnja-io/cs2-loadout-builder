import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';
import { priceCache } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { PriceData, PriceSource } from '@lb/shared';

type Db = PostgresJsDatabase<typeof schema>;

export const PRICE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function fetchSteamPrice(skinId: number, marketHashName: string): Promise<PriceData> {
  const encoded = encodeURIComponent(marketHashName);
  const url = `https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=${encoded}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Steam price fetch failed:', res.status);
    return { skinId, source: 'steam', price: null, currency: 'USD', listingUrl: null, updatedAt: new Date().toISOString() };
  }
  const data = await res.json() as { success: boolean; lowest_price?: string };
  const price = data.success && data.lowest_price
    ? parseFloat(data.lowest_price.replace(/[^0-9.]/g, ''))
    : null;
  return {
    skinId, source: 'steam', price: price !== null ? Math.max(0, price) : null,
    currency: 'USD', listingUrl: null, updatedAt: new Date().toISOString(),
  };
}

async function fetchCsFloatPrice(skinId: number): Promise<PriceData> {
  return {
    skinId, source: 'csfloat', price: null, currency: 'USD',
    listingUrl: 'https://csfloat.com/', updatedAt: new Date().toISOString(),
  };
}

async function fetchBitskinPrice(skinId: number): Promise<PriceData> {
  return {
    skinId, source: 'bitskin', price: null, currency: 'USD',
    listingUrl: 'https://bitskins.com/', updatedAt: new Date().toISOString(),
  };
}

export async function getPrices(
  skinId: number,
  sources: PriceSource[],
  db: Db,
  marketHashName: string
): Promise<PriceData[]> {
  const now = Date.now();
  const results: PriceData[] = [];
  const toFetch: PriceSource[] = [];

  for (const source of sources) {
    const [cached] = await db.select().from(priceCache)
      .where(and(eq(priceCache.skinId, skinId), eq(priceCache.source, source)));

    const age = cached ? now - new Date(cached.updatedAt).getTime() : Infinity;
    if (cached && age < PRICE_TTL_MS) {
      results.push({ ...cached, source: cached.source as PriceSource, price: cached.price ?? null, updatedAt: cached.updatedAt.toISOString() });
    } else {
      toFetch.push(source);
      // stale-while-revalidate: serve stale immediately, refresh async
      if (cached) {
        results.push({ ...cached, source: cached.source as PriceSource, price: cached.price ?? null, updatedAt: cached.updatedAt.toISOString() });
      }
    }
  }

  if (toFetch.length > 0) {
    const fetchers: Record<PriceSource, () => Promise<PriceData>> = {
      steam: () => fetchSteamPrice(skinId, marketHashName),
      csfloat: () => fetchCsFloatPrice(skinId),
      bitskin: () => fetchBitskinPrice(skinId),
    };

    void (async () => {
      for (const source of toFetch) {
        try {
          const data = await fetchers[source]!();
          await db.insert(priceCache).values({
            skinId: data.skinId, source: data.source, price: data.price,
            currency: data.currency, listingUrl: data.listingUrl,
          }).onConflictDoUpdate({
            target: [priceCache.skinId, priceCache.source],
            set: { price: data.price, listingUrl: data.listingUrl, updatedAt: new Date() },
          });
        } catch { /* price data is non-critical */ }
      }
    })();
  }

  return results;
}
