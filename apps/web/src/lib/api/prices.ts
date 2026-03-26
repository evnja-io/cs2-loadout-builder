import { apiFetch } from './client.js';
import type { PriceData, PriceSource } from '@lb/shared';

export async function getPrices(
  skinId: number,
  sources: PriceSource[] = ['steam', 'csfloat', 'bitskin']
): Promise<PriceData[]> {
  const params = new URLSearchParams({
    skinId: String(skinId),
    sources: sources.join(','),
  });
  return apiFetch(`/prices?${params}`);
}
