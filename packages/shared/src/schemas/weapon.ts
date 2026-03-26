import { z } from 'zod';

export const WeaponCategorySchema = z.enum([
  'rifles', 'pistols', 'smgs', 'shotguns', 'heavies', 'knives', 'gloves'
]);

export const WeaponSchema = z.object({
  defIndex: z.number().int().nonnegative(),
  name: z.string().min(1),
  category: WeaponCategorySchema,
  modelPath: z.string().nullable(),
  iconPath: z.string().nullable(),
});

export type Weapon = z.infer<typeof WeaponSchema>;
export type WeaponCategory = z.infer<typeof WeaponCategorySchema>;
