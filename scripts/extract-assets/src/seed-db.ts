/**
 * Seeds the PostgreSQL database with weapon + skin records from the extraction pipeline.
 *
 * Usage:
 *   tsx src/seed-db.ts --output /path/to/extraction/output
 *   tsx src/seed-db.ts --output /path/to/extraction/output --clear  # drop existing records first
 */
import { Command } from 'commander';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { weapons as weaponsTable, skins as skinsTable } from '../../../apps/api/src/db/schema.js';
import { loadCatalogueFromJson } from './parse-items-game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT = join(__dirname, '..', 'output');

const program = new Command();
program
  .name('seed-db')
  .description('Seed weapons + skins into the database from extracted catalogue JSON')
  .option('--output <path>', 'Path to extraction output directory containing weapons_catalogue.json and skins_catalogue.json', DEFAULT_OUTPUT)
  .option('--database-url <url>', 'PostgreSQL connection string', process.env['DATABASE_URL'] ?? 'postgres://sephi:sephi@localhost:5432/loadout_builder')
  .option('--clear', 'Delete existing weapon/skin records before inserting', false)
  .option('--batch-size <n>', 'Insert batch size', '500')
  .parse();

const opts = program.opts() as {
  output: string;
  databaseUrl: string;
  clear: boolean;
  batchSize: string;
};

const BATCH = parseInt(opts.batchSize, 10);

const pgClient = postgres(opts.databaseUrl, { max: 5 });
const db = drizzle(pgClient);

async function main() {
  console.log('Loading catalogue from', opts.output);
  const { weapons, skins } = await loadCatalogueFromJson(opts.output);
  console.log(`  ${weapons.length} weapons, ${skins.length} skins`);

  if (opts.clear) {
    console.log('Clearing existing records...');
    // Clear dependents first (FK → skins → weapons)
    await db.execute(sql`DELETE FROM price_cache`);
    await db.execute(sql`DELETE FROM loadout_slots`);
    await db.execute(sql`DELETE FROM loadouts`);
    await db.delete(skinsTable);
    await db.delete(weaponsTable);
    console.log('  Done');
  }

  // ─── Insert weapons ──────────────────────────────────────────────────────────
  console.log('Inserting weapons...');
  for (let i = 0; i < weapons.length; i += BATCH) {
    const batch = weapons.slice(i, i + BATCH);
    await db
      .insert(weaponsTable)
      .values(batch.map(w => ({
        defIndex: w.defIndex,
        name: w.name,
        category: w.category,
        modelPath: w.modelPath,
        iconPath: w.iconPath,
      })))
      .onConflictDoUpdate({
        target: weaponsTable.defIndex,
        set: {
          name: sql`EXCLUDED.name`,
          category: sql`EXCLUDED.category`,
          modelPath: sql`EXCLUDED.model_path`,
          iconPath: sql`EXCLUDED.icon_path`,
        },
      });
    process.stdout.write(`  ${Math.min(i + BATCH, weapons.length)}/${weapons.length}\r`);
  }
  console.log(`  Inserted ${weapons.length} weapons`);

  // ─── Insert skins ────────────────────────────────────────────────────────────
  console.log('Inserting skins...');
  for (let i = 0; i < skins.length; i += BATCH) {
    const batch = skins.slice(i, i + BATCH);
    await db
      .insert(skinsTable)
      .values(batch.map(s => ({
        id: s.weaponDefIndex * 100000 + s.paintKitId,
        weaponDefIndex: s.weaponDefIndex,
        paintKitId: s.paintKitId,
        name: s.name,
        rarity: s.rarity,
        finishStyle: s.finishStyle,
        patternTexture: s.patternTexture,
        roughnessTexture: s.roughnessTexture,
        iconPath: s.iconPath,
        colorA: s.colorA ? JSON.stringify(s.colorA) : null,
        colorB: s.colorB ? JSON.stringify(s.colorB) : null,
        colorC: s.colorC ? JSON.stringify(s.colorC) : null,
        colorD: s.colorD ? JSON.stringify(s.colorD) : null,
        colorWarp: s.colorWarp,
        phase: s.phase,
        wearMin: s.wearMin,
        wearMax: s.wearMax,
      })))
      .onConflictDoUpdate({
        target: skinsTable.id,
        set: {
          name: sql`EXCLUDED.name`,
          rarity: sql`EXCLUDED.rarity`,
          finishStyle: sql`EXCLUDED.finish_style`,
          patternTexture: sql`EXCLUDED.pattern_texture`,
          roughnessTexture: sql`EXCLUDED.roughness_texture`,
          iconPath: sql`EXCLUDED.icon_path`,
          colorA: sql`EXCLUDED.color_a`,
          colorB: sql`EXCLUDED.color_b`,
          colorC: sql`EXCLUDED.color_c`,
          colorD: sql`EXCLUDED.color_d`,
          colorWarp: sql`EXCLUDED.color_warp`,
          phase: sql`EXCLUDED.phase`,
          wearMin: sql`EXCLUDED.wear_min`,
          wearMax: sql`EXCLUDED.wear_max`,
        },
      });
    process.stdout.write(`  ${Math.min(i + BATCH, skins.length)}/${skins.length}\r`);
  }
  console.log(`  Inserted ${skins.length} skins`);

  await pgClient.end();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
