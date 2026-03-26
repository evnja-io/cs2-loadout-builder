"""
Blender headless script — exports CS2 weapon models (.vmdl_c) to GLB.

Run via:
  blender.exe --background --python export_models.py -- \
    --vpk "C:/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/pak01_dir.vpk" \
    --sourceio "C:/Users/Sephi/Downloads/SourceIO" \
    --weapons-json "C:/path/to/weapons_catalogue.json" \
    --output "C:/path/to/output/assets"
"""
import sys
import os
import json
import argparse
import tempfile
import shutil
from pathlib import Path

# Parse args after '--' separator (Blender passes its own args before --)
argv = sys.argv
try:
    script_args = argv[argv.index('--') + 1:]
except ValueError:
    script_args = []

parser = argparse.ArgumentParser()
parser.add_argument('--vpk', required=True)
parser.add_argument('--sourceio', required=True)
parser.add_argument('--weapons-json', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(script_args)

import bpy
import addon_utils

# ─── Enable SourceIO addon ─────────────────────────────────────────────────────
# In headless mode Blender doesn't add user scripts to sys.path, so we must
# add both the user addons directory AND the downloaded SourceIO package.
sys.path.insert(0, args.sourceio)  # C:\Users\Sephi\Downloads\SourceIO  (has nested SourceIO/)

appdata = os.environ.get('APPDATA', r'C:\Users\Sephi\AppData\Roaming')
user_addons = os.path.join(
    appdata, 'Blender Foundation', 'Blender', '5.1', 'config', 'scripts', 'addons'
)
if user_addons not in sys.path:
    sys.path.insert(0, user_addons)

addon_utils.modules_refresh()
mod = addon_utils.enable('SourceIO', default_set=False, persistent=False)
if mod is None:
    print('[ERROR] Failed to enable SourceIO addon. Make sure it is installed in Blender user addons.')
    sys.exit(1)
print('[INFO] SourceIO enabled')

# ─── Set up ContentManager ─────────────────────────────────────────────────────
from SourceIO.library.shared.content_manager.manager import ContentManager
from SourceIO.library.utils.tiny_path import TinyPath

vpk_path = Path(args.vpk)
game_dir = vpk_path.parent.parent  # .../game/csgo → .../game

cm = ContentManager()
cm.scan_for_content(TinyPath(str(game_dir)))
print(f'[INFO] ContentManager ready, game_dir={game_dir}')

# ─── Load weapons list ─────────────────────────────────────────────────────────
with open(args.weapons_json, 'r') as f:
    weapons = json.load(f)

print(f'[INFO] Processing {len(weapons)} weapons')

output = Path(args.output)
success = 0
failed = 0

# ─── Export each weapon ────────────────────────────────────────────────────────
for weapon in weapons:
    def_index = weapon['defIndex']
    model_path = weapon['modelPath']  # e.g. "weapons/models/ak47/weapon_rif_ak47.vmdl"
    name = weapon.get('name', str(def_index))

    out_path = output / 'weapons' / str(def_index) / 'model.glb'
    if out_path.exists():
        print(f'[SKIP] {name} (already exists)')
        success += 1
        continue

    print(f'[INFO] Exporting {name} (defIndex={def_index})...')

    tmp_dir = None
    try:
        # The compiled path has _c suffix
        vmdl_c_rel = model_path + '_c'

        # Extract .vmdl_c from VPK to a temp file
        entry = cm.find_file(TinyPath(vmdl_c_rel))
        if entry is None:
            print(f'[WARN] Model not found in VPK: {vmdl_c_rel}')
            failed += 1
            continue

        data = entry.read()

        # Write to temp dir (ContentManager is already set up, discover_resources=False)
        tmp_dir = tempfile.mkdtemp()
        tmp_file = Path(tmp_dir) / Path(vmdl_c_rel.replace('/', os.sep))
        tmp_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_file.write_bytes(data)

        # Clear scene without resetting the ContentManager singleton
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete()
        for mesh in list(bpy.data.meshes):
            bpy.data.meshes.remove(mesh)
        for mat in list(bpy.data.materials):
            bpy.data.materials.remove(mat)

        # Import via SourceIO — ContentManager already has VPK loaded for texture lookups
        import_result = bpy.ops.sourceio.vmdl(
            filepath=str(tmp_file),
            files=[{'name': tmp_file.name}],
            directory=str(tmp_file.parent),
            discover_resources=False,
            import_physics=False,
            import_materials=False,
            import_attachments=False,
        )

        if import_result != {'FINISHED'}:
            print(f'[WARN] Import returned {import_result} for {name}')

        meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
        if not meshes:
            print(f'[WARN] No meshes imported for {name}')
            failed += 1
            continue

        # Export as GLB
        out_path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(
            filepath=str(out_path),
            export_format='GLB',
            export_apply=True,
            export_materials='NONE',
            export_cameras=False,
            export_lights=False,
        )
        print(f'[OK] {name} → {out_path} ({len(meshes)} meshes)')
        success += 1

    except Exception as e:
        print(f'[ERROR] Failed to export {name}: {e}')
        import traceback
        traceback.print_exc()
        failed += 1

    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)

print(f'[DONE] {success} succeeded, {failed} failed')
