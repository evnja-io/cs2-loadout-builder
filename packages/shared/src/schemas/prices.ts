import { z } from 'zod';

export const PriceSourceSchema = z.enum(['steam', 'csfloat', 'bitskin']);

export const PriceDataSchema = z.object({
  skinId: z.number().int().positive(),
  source: PriceSourceSchema,
  price: z.number().nonnegative().nullable(),
  currency: z.string().default('USD'),
  listingUrl: z.string().url().nullable(),
  updatedAt: z.string().datetime(),
});

export const InventoryItemSchema = z.object({
  weaponDefIndex: z.number().int().nonnegative(),
  skinId: z.number().int().positive(),
  wear: z.number().min(0).max(1),
  seed: z.number().int().min(1).max(1000),
  statTrak: z.boolean(),
  iconUrl: z.string().url(),
  marketHashName: z.string(),
});

export type PriceSource = z.infer<typeof PriceSourceSchema>;
export type PriceData = z.infer<typeof PriceDataSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
