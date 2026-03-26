import { Command } from 'commander';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copySampleAssets } from './sample-copy.js';
import { runFullExtraction } from './full-extraction.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const program = new Command();
program
  .name('extract-assets')
  .description('Extract CS2 weapon models and textures for the loadout builder')
  .option('--sample', 'Copy sample fixture assets for development (no CS2 install needed)')
  .option('--full', 'Run full extraction from CS2 VPK files (requires CS2 installed)')
  .option('--cs2-path <path>', 'Path to CS2 installation', 'C:/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive')
  // Default: resolve from monorepo root (scripts/extract-assets/src -> ../../..)
  .option('--output <path>', 'Output directory', join(__dirname, '..', '..', '..', 'apps', 'web', 'static', 'assets'))
  .parse();

const opts = program.opts();

if (opts['sample']) {
  await copySampleAssets(opts['output'] as string);
  console.log('✓ Sample assets copied to', opts['output']);
} else if (opts['full']) {
  await runFullExtraction(opts['cs2Path'] as string, opts['output'] as string);
  console.log('✓ Full extraction complete');
} else {
  program.help();
}
