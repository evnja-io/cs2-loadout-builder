import { z } from 'zod';

export const RaritySchema = z.enum([
  'consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'contraband'
]);

export const FinishStyleSchema = z.enum([
  'solid', 'hydrographic', 'spray-paint', 'anodized',
  'anodized-multicolored', 'gunsmith', 'custom-paint-job'
]);

const ColorVec = z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable();

export const SkinSchema = z.object({
  id: z.number().int().positive(),
  weaponDefIndex: z.number().int().nonnegative(),
  paintKitId: z.number().int().nonnegative(),
  name: z.string().min(1),
  rarity: RaritySchema,
  finishStyle: FinishStyleSchema,
  patternTexture: z.string().nullable(),
  roughnessTexture: z.string().nullable(),  // metalness map
  iconPath: z.string().nullable(),
  colorA: ColorVec.default(null),
  colorB: ColorVec.default(null),
  colorC: ColorVec.default(null),
  colorD: ColorVec.default(null),
  colorWarp: z.number().default(0),
  phase: z.number().default(0),
  wearMin: z.number().min(0).max(1),
  wearMax: z.number().min(0).max(1),
}).refine(data => data.wearMin <= data.wearMax, {
  message: 'wearMin must be <= wearMax',
  path: ['wearMin'],
});

export type Skin = z.infer<typeof SkinSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type FinishStyle = z.infer<typeof FinishStyleSchema>;
