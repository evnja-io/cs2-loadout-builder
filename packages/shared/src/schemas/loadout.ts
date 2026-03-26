import { z } from 'zod';

export const LoadoutSlotSchema = z.object({
  id: z.string().uuid(),
  loadoutId: z.string().uuid(),
  weaponDefIndex: z.number().int().nonnegative(),
  skinId: z.number().int().positive(),
  wear: z.number().min(0).max(1),
  seed: z.number().int().min(1).max(1000),
  statTrak: z.boolean(),
});

export const LoadoutSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1).max(64),
  isPublic: z.boolean(),
  shareSlug: z.string().length(8).nullable(),
  likesCount: z.number().int().nonnegative(),
  slots: z.array(LoadoutSlotSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateLoadoutSchema = z.object({
  name: z.string().min(1).max(64),
});

export const UpdateLoadoutSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  isPublic: z.boolean().optional(),
});

export const UpsertSlotSchema = z.object({
  weaponDefIndex: z.number().int().nonnegative(),
  skinId: z.number().int().positive(),
  wear: z.number().min(0).max(1).default(0.15),
  seed: z.number().int().min(1).max(1000).default(500),
  statTrak: z.boolean().default(false),
});

export const BulkSlotsSchema = z.object({
  slots: z.array(UpsertSlotSchema),
});

export type Loadout = z.infer<typeof LoadoutSchema>;
export type LoadoutSlot = z.infer<typeof LoadoutSlotSchema>;
export type CreateLoadout = z.infer<typeof CreateLoadoutSchema>;
export type UpdateLoadout = z.infer<typeof UpdateLoadoutSchema>;
export type UpsertSlot = z.infer<typeof UpsertSlotSchema>;
