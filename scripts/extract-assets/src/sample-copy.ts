import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = join(__dirname, 'sample');

export async function copySampleAssets(outputPath: string): Promise<void> {
  await mkdir(outputPath, { recursive: true });

  if (!existsSync(SAMPLE_DIR)) {
    console.warn('⚠ Sample directory not found. Creating placeholder structure.');
    await mkdir(join(outputPath, 'weapons', '7'), { recursive: true });
    await mkdir(join(outputPath, 'weapons', '507'), { recursive: true });

    const weaponsCatalogue = [
      { defIndex: 7, name: 'AK-47', category: 'rifles', modelPath: '/assets/weapons/7/model.glb', iconPath: null },
      { defIndex: 507, name: 'Karambit', category: 'knives', modelPath: '/assets/weapons/507/model.glb', iconPath: null },
    ];
    const skinsCatalogue = [
      { id: 1, weaponDefIndex: 7, paintKitId: 44, name: 'Redline', rarity: 'classified', finishStyle: 'hydrographic', wearMin: 0.1, wearMax: 0.45 },
      { id: 2, weaponDefIndex: 7, paintKitId: 675, name: 'Asiimov', rarity: 'covert', finishStyle: 'hydrographic', wearMin: 0.18, wearMax: 1.0 },
    ];

    await writeFile(join(outputPath, 'weapons.json'), JSON.stringify(weaponsCatalogue, null, 2));
    await writeFile(join(outputPath, 'skins.json'), JSON.stringify(skinsCatalogue, null, 2));
    return;
  }

  const copyDir = async (src: string, dest: string) => {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) await copyDir(join(src, entry.name), join(dest, entry.name));
      else await copyFile(join(src, entry.name), join(dest, entry.name));
    }
  };
  await copyDir(SAMPLE_DIR, outputPath);
}
