/**
 * Items game catalogue parser.
 * Reads the JSON output from the Python extraction pipeline
 * (weapons_catalogue.json + skins_catalogue.json) and returns
 * normalized records ready for DB insertion.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface WeaponRecord {
  defIndex: number;
  name: string;
  internalName: string;
  category: string;
  modelPath: string;
  iconPath: string | null;
}

export interface SkinRecord {
  weaponDefIndex: number;
  paintKitId: number;
  kitName: string;
  name: string;
  rarity: string;
  finishStyle: string;
  wearMin: number;
  wearMax: number;
  patternTexture: string | null;
  roughnessTexture: string | null;
  iconPath: string | null;
  colorA: [number, number, number, number] | null;
  colorB: [number, number, number, number] | null;
  colorC: [number, number, number, number] | null;
  colorD: [number, number, number, number] | null;
  colorWarp: number;
  phase: number;
}

export async function loadCatalogueFromJson(outputDir: string): Promise<{
  weapons: WeaponRecord[];
  skins: SkinRecord[];
}> {
  const weaponsRaw = JSON.parse(
    await readFile(`${outputDir}/weapons_catalogue.json`, 'utf-8')
  ) as Array<{
    defIndex: number;
    name: string;
    internalName: string;
    category: string;
    modelPath: string;
  }>;

  const skinsRaw = JSON.parse(
    await readFile(`${outputDir}/skins_catalogue.json`, 'utf-8')
  ) as Array<{
    weaponDefIndex: number;
    paintKitId: number;
    kitName: string;
    name: string;
    rarity: string;
    finishStyle: string;
    wearMin: number;
    wearMax: number;
    iconPath: string | null;
    colorA: [number, number, number, number] | null;
    colorB: [number, number, number, number] | null;
    colorC: [number, number, number, number] | null;
    colorD: [number, number, number, number] | null;
    colorWarp: number;
    phase: number;
  }>;

  const weapons: WeaponRecord[] = weaponsRaw.map(w => ({
    defIndex: w.defIndex,
    name: w.name,
    internalName: w.internalName,
    category: w.category,
    modelPath: w.modelPath,
    iconPath: null,  // weapons don't have per-weapon icons from Python pipeline
  }));

  const skins: SkinRecord[] = skinsRaw.map(s => ({
    weaponDefIndex: s.weaponDefIndex,
    paintKitId: s.paintKitId,
    kitName: s.kitName,
    name: s.name,
    rarity: s.rarity,
    finishStyle: s.finishStyle,
    wearMin: s.wearMin,
    wearMax: s.wearMax,
    patternTexture: existsSync(`${outputDir}/kits/${s.paintKitId}/pattern.webp`)
      ? `kits/${s.paintKitId}/pattern.webp`
      : null,
    roughnessTexture: existsSync(`${outputDir}/kits/${s.paintKitId}/roughness.webp`)
      ? `kits/${s.paintKitId}/roughness.webp`
      : null,
    iconPath: s.iconPath ?? null,
    colorA: s.colorA ?? null,
    colorB: s.colorB ?? null,
    colorC: s.colorC ?? null,
    colorD: s.colorD ?? null,
    colorWarp: s.colorWarp ?? 0,
    phase: s.phase ?? 0,
  }));

  return { weapons, skins };
}
