/**
 * Full CS2 asset extraction orchestrator.
 * Runs the 4-phase pipeline:
 *   1. Python texture extraction (WSL2) → items_game.txt + textures
 *   2. Blender model export (Windows Blender) → GLBs
 *   3. Catalogue parsing → weapons.json + skins.json
 *   4. DB seeding (optional, use --seed flag)
 */
import { spawn, execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, access, readFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

const CS2_PATH = '/mnt/c/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive';
const VPK_PATH = `${CS2_PATH}/game/csgo/pak01_dir.vpk`;
const SOURCEIO_PATH = '/mnt/c/Users/Sephi/Downloads/SourceIO';
const BLENDER_EXE = '/mnt/c/Program Files/Blender Foundation/Blender 5.1/blender.exe';

const PYTHON_DIR = join(__dirname, '..', 'python');
const VENV_PYTHON = join(__dirname, '..', '.venv', 'bin', 'python3');

export interface ExtractionOptions {
  cs2Path?: string;
  outputPath: string;
  assetsPath: string;  // web static assets dir
  seedDb?: boolean;
  databaseUrl?: string;
  kits?: string;       // comma-separated kit IDs filter
}

function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    });
    proc.on('error', reject);
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}: ${cmd} ${args[0]}`));
    });
  });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function runFullExtraction(cs2PathArg: string, outputPathArg: string): Promise<void> {
  const cs2Path = cs2PathArg || CS2_PATH;
  const vpkPath = `${cs2Path}/game/csgo/pak01_dir.vpk`;

  // Determine output dirs
  const extractionOutput = join(ROOT, 'scripts', 'extract-assets', 'output');
  const assetsOutput = join(ROOT, 'apps', 'web', 'static', 'assets');

  await mkdir(extractionOutput, { recursive: true });
  await mkdir(assetsOutput, { recursive: true });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' CS2 Asset Extraction Pipeline');
  console.log('═══════════════════════════════════════════════════════');
  console.log(` CS2 Path:       ${cs2Path}`);
  console.log(` VPK:            ${vpkPath}`);
  console.log(` Extraction out: ${extractionOutput}`);
  console.log(` Assets out:     ${outputPathArg || assetsOutput}`);

  const finalAssetsPath = outputPathArg || assetsOutput;

  // ─── Phase 1: Python texture + catalogue extraction ────────────────────────
  console.log('\n─── Phase 1: Texture + Catalogue Extraction (Python) ───');

  const catalogueDone = await exists(join(extractionOutput, 'weapons_catalogue.json'));
  if (catalogueDone) {
    console.log('[SKIP] Catalogue already extracted (delete output/weapons_catalogue.json to re-run)');
  } else {
    if (!(await exists(VENV_PYTHON))) {
      throw new Error(`Python venv not found at ${VENV_PYTHON}. Run: python3 -m venv scripts/extract-assets/.venv && .venv/bin/pip install numpy Pillow`);
    }

    const extractArgs = [
      join(PYTHON_DIR, 'extract_textures.py'),
      '--vpk', vpkPath,
      '--sourceio', SOURCEIO_PATH,
      '--output', extractionOutput,
    ];

    await run(VENV_PYTHON, extractArgs);
  }

  // Copy textures to web assets dir
  console.log('\nCopying extracted textures to web assets...');
  await run('rsync', ['-av', '--progress',
    join(extractionOutput, 'kits') + '/',
    join(finalAssetsPath, 'kits') + '/',
  ]).catch(() => {
    // rsync may not be available, use cp fallback
    return run('cp', ['-rn', join(extractionOutput, 'kits'), join(finalAssetsPath, 'kits')]);
  });
  await run('rsync', ['-av', '--progress',
    join(extractionOutput, 'shared') + '/',
    join(finalAssetsPath, 'shared') + '/',
  ]).catch(() => {
    return run('cp', ['-rn', join(extractionOutput, 'shared'), join(finalAssetsPath, 'shared')]);
  });

  // ─── Phase 2: Blender model export ────────────────────────────────────────
  console.log('\n─── Phase 2: Model Export (Blender + SourceIO) ─────────');

  if (!(await exists(BLENDER_EXE))) {
    console.warn(`[WARN] Blender not found at ${BLENDER_EXE}. Skipping model export.`);
    console.warn('       Install Blender 5.1 or set the correct path in full-extraction.ts');
  } else {
    const weaponsCatalogue = join(extractionOutput, 'weapons_catalogue.json');
    if (!(await exists(weaponsCatalogue))) {
      throw new Error(`weapons_catalogue.json not found. Phase 1 must complete first.`);
    }

    // Convert any path to a Windows path that Blender (a Windows .exe) can open.
    const toWinPath = (p: string): string => {
      // Already a Windows drive path (C:/... or C:\...) — just normalize slashes
      if (/^[A-Za-z]:/.test(p)) {
        return p.replace(/\//g, '\\');
      }
      // WSL path (/mnt/x/... or /home/...) — use wslpath for correct conversion
      try {
        return execSync(`wslpath -w "${p}"`).toString().trim();
      } catch {
        return `\\\\wsl.localhost\\Ubuntu-24.04${p.replace(/\//g, '\\')}`;
      }
    };

    const blenderArgs = [
      '--background',
      '--python', toWinPath(join(PYTHON_DIR, 'export_models.py')),
      '--',
      '--vpk', toWinPath(vpkPath),
      '--sourceio', toWinPath(SOURCEIO_PATH),
      '--weapons-json', toWinPath(weaponsCatalogue),
      '--output', toWinPath(finalAssetsPath),
    ];

    await run(BLENDER_EXE, blenderArgs);
  }

  // ─── Phase 3: Summary ──────────────────────────────────────────────────────
  console.log('\n─── Phase 3: Summary ────────────────────────────────────');

  try {
    const weapons = JSON.parse(await readFile(join(extractionOutput, 'weapons_catalogue.json'), 'utf-8')) as unknown[];
    const skins = JSON.parse(await readFile(join(extractionOutput, 'skins_catalogue.json'), 'utf-8')) as unknown[];
    console.log(`  Weapons: ${weapons.length}`);
    console.log(`  Skins:   ${skins.length}`);
  } catch {
    console.log('  (catalogue files not found yet)');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' Extraction complete!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\nNext step: seed the database:');
  console.log(`  pnpm --filter @lb/extract-assets seed`);
}
