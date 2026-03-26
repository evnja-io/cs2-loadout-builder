"""
CS2 texture extraction pipeline (v2).

Uses the `vdf` library for robust parsing of items_game.txt (VDFDict preserves
duplicate keys). Extracts full catalogue including knives and gloves, localized
skin names, color params from vmats, and skin icons from VPK.

Usage:
  python extract_textures.py \
    --vpk /mnt/c/.../csgo/pak01_dir.vpk \
    --sourceio /path/to/SourceIO \
    --output /path/to/assets \
    [--kits 38,39,40]
"""
import sys
import json
import re
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(levelname)s %(message)s')
log = logging.getLogger('extract')


# ─── Finish style maps ────────────────────────────────────────────────────────
# F_PAINT_STYLE integer from vmat m_intParams → TS finish style key
VMAT_FINISH_STYLE: dict[int, str] = {
    0: 'solid',
    1: 'hydrographic',
    2: 'spray-paint',
    3: 'anodized',
    4: 'anodized-multicolored',
    5: 'anodized-multicolored',   # anodized-airbrushed, same rendering path
    6: 'custom-paint-job',
    7: 'gunsmith',
    8: 'spray-paint',             # patina
}
# Fallback: items_game.txt "style" string field when no vmat
ITEMS_FINISH_STYLE: dict[str, str] = {
    '0': 'solid', '1': 'solid', '2': 'hydrographic', '3': 'spray-paint',
    '4': 'anodized', '5': 'anodized-multicolored', '6': 'anodized-multicolored',
    '7': 'gunsmith', '8': 'custom-paint-job',
}

WEAPON_DISPLAY_NAMES: dict[str, str] = {
    # Rifles
    'weapon_ak47': 'AK-47', 'weapon_m4a1': 'M4A4', 'weapon_m4a1_silencer': 'M4A1-S',
    'weapon_awp': 'AWP', 'weapon_aug': 'AUG', 'weapon_sg556': 'SG 553',
    'weapon_famas': 'FAMAS', 'weapon_galilar': 'Galil AR',
    'weapon_scar20': 'SCAR-20', 'weapon_g3sg1': 'G3SG1', 'weapon_ssg08': 'SSG 08',
    # Pistols
    'weapon_deagle': 'Desert Eagle', 'weapon_glock': 'Glock-18',
    'weapon_usp_silencer': 'USP-S', 'weapon_hkp2000': 'P2000', 'weapon_p250': 'P250',
    'weapon_fiveseven': 'Five-SeveN', 'weapon_tec9': 'Tec-9', 'weapon_cz75a': 'CZ75-Auto',
    'weapon_elite': 'Dual Berettas', 'weapon_revolver': 'R8 Revolver',
    # SMGs
    'weapon_bizon': 'PP-Bizon', 'weapon_mac10': 'MAC-10', 'weapon_mp5sd': 'MP5-SD',
    'weapon_mp7': 'MP7', 'weapon_mp9': 'MP9', 'weapon_p90': 'P90', 'weapon_ump45': 'UMP-45',
    # Heavy
    'weapon_m249': 'M249', 'weapon_negev': 'Negev', 'weapon_nova': 'Nova',
    'weapon_xm1014': 'XM1014', 'weapon_mag7': 'MAG-7', 'weapon_sawedoff': 'Sawed-Off',
    'weapon_taser': 'Zeus x27',
    # Knives
    'weapon_knife': 'Knife', 'weapon_knife_t': 'Knife',
    'weapon_knife_bayonet': 'Bayonet', 'weapon_knife_flip': 'Flip Knife',
    'weapon_knife_gut': 'Gut Knife', 'weapon_knife_karambit': 'Karambit',
    'weapon_knife_m9_bayonet': 'M9 Bayonet', 'weapon_knife_tactical': 'Huntsman Knife',
    'weapon_knife_falchion': 'Falchion Knife', 'weapon_knife_survival_bowie': 'Bowie Knife',
    'weapon_knife_butterfly': 'Butterfly Knife', 'weapon_knife_push': 'Shadow Daggers',
    'weapon_knife_ursus': 'Ursus Knife', 'weapon_knife_gypsy_jackknife': 'Navaja Knife',
    'weapon_knife_stiletto': 'Stiletto Knife', 'weapon_knife_widowmaker': 'Talon Knife',
    'weapon_knife_css': 'Classic Knife', 'weapon_knife_cord': 'Paracord Knife',
    'weapon_knife_canis': 'Survival Knife', 'weapon_knife_outdoor': 'Nomad Knife',
    'weapon_knife_skeleton': 'Skeleton Knife',
    # Gloves
    'weapon_bloodhound_gloves': 'Bloodhound Gloves',
    'weapon_t_gloves': 'Sport Gloves', 'weapon_ct_gloves': 'Driving Gloves',
    'weapon_sport_gloves': 'Sport Gloves', 'weapon_motorcycle_gloves': 'Moto Gloves',
    'weapon_specialist_gloves': 'Specialist Gloves', 'weapon_hydra_gloves': 'Hydra Gloves',
}
WEAPON_CATEGORIES: dict[str, str] = {
    **{w: 'rifles' for w in [
        'weapon_ak47', 'weapon_m4a1', 'weapon_m4a1_silencer', 'weapon_awp',
        'weapon_aug', 'weapon_sg556', 'weapon_famas', 'weapon_galilar',
        'weapon_scar20', 'weapon_g3sg1', 'weapon_ssg08',
    ]},
    **{w: 'pistols' for w in [
        'weapon_deagle', 'weapon_glock', 'weapon_usp_silencer', 'weapon_hkp2000',
        'weapon_p250', 'weapon_fiveseven', 'weapon_tec9', 'weapon_cz75a',
        'weapon_elite', 'weapon_revolver', 'weapon_taser',
    ]},
    **{w: 'smgs' for w in [
        'weapon_bizon', 'weapon_mac10', 'weapon_mp5sd', 'weapon_mp7',
        'weapon_mp9', 'weapon_p90', 'weapon_ump45',
    ]},
    **{w: 'heavy' for w in [
        'weapon_m249', 'weapon_negev', 'weapon_nova', 'weapon_xm1014',
        'weapon_mag7', 'weapon_sawedoff',
    ]},
    **{w: 'knives' for w in [
        'weapon_knife', 'weapon_knife_t', 'weapon_knife_bayonet', 'weapon_knife_flip',
        'weapon_knife_gut', 'weapon_knife_karambit', 'weapon_knife_m9_bayonet',
        'weapon_knife_tactical', 'weapon_knife_falchion', 'weapon_knife_survival_bowie',
        'weapon_knife_butterfly', 'weapon_knife_push', 'weapon_knife_ursus',
        'weapon_knife_gypsy_jackknife', 'weapon_knife_stiletto', 'weapon_knife_widowmaker',
        'weapon_knife_css', 'weapon_knife_cord', 'weapon_knife_canis',
        'weapon_knife_outdoor', 'weapon_knife_skeleton',
    ]},
    **{w: 'gloves' for w in [
        'weapon_bloodhound_gloves', 'weapon_t_gloves', 'weapon_ct_gloves',
        'weapon_sport_gloves', 'weapon_motorcycle_gloves',
        'weapon_specialist_gloves', 'weapon_hydra_gloves',
    ]},
}

KIT_WEAPON_RE = re.compile(r'^\[([^\]]+)\](weapon_[a-z0-9_]+)$')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--vpk', required=True, help='Path to pak01_dir.vpk')
    parser.add_argument('--sourceio', required=True, help='SourceIO directory')
    parser.add_argument('--output', required=True, help='Output assets directory')
    parser.add_argument('--kits', help='Comma-separated paint kit IDs (default: all)')
    args = parser.parse_args()

    sys.path.insert(0, args.sourceio)
    from SourceIO.library.utils.pylib import VPKFile  # type: ignore
    from SourceIO.library.utils import MemoryBuffer  # type: ignore
    from SourceIO.library.source2.resource_types.compiled_texture_resource import CompiledTextureResource  # type: ignore
    from SourceIO.library.source2.resource_types.compiled_material_resource import CompiledMaterialResource  # type: ignore
    from SourceIO.library.utils.tiny_path import TinyPath  # type: ignore
    import numpy as np  # type: ignore
    from PIL import Image  # type: ignore
    import vdf as vdflib  # type: ignore

    MAX_SIZE = 1024

    vpk = VPKFile(args.vpk)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    # ─── 1. Extract items_game.txt ────────────────────────────────────────────
    log.info('Extracting items_game.txt...')
    results = list(vpk.glob('scripts/items/items_game.txt'))
    if not results:
        log.error('items_game.txt not found in VPK')
        sys.exit(1)
    _, items_game_data = results[0]
    (output / 'items_game.txt').write_bytes(items_game_data)
    log.info(f'  {len(items_game_data):,} bytes')

    # ─── 2. Extract csgo_english.txt for localization ─────────────────────────
    loca_tokens: dict[str, str] = {}
    for lang_file in ('resource/csgo_english.txt', 'resource/csgo_english_utf8.txt'):
        raw = vpk.find_file(lang_file)
        if not raw:
            continue
        try:
            try:
                text = raw.decode('utf-16-le').lstrip('\ufeff')
            except UnicodeDecodeError:
                text = raw.decode('utf-8', errors='replace')
            parsed = vdflib.loads(text, mapper=vdflib.VDFDict)
            tokens = parsed.get('lang', {}).get('Tokens', {})
            for k, v in tokens.items():
                if isinstance(v, str):
                    loca_tokens[k] = v
            log.info(f'  Loaded {len(loca_tokens):,} tokens from {lang_file}')
            break
        except Exception as exc:
            log.warning(f'  Failed to parse {lang_file}: {exc}')

    # ─── 3. Parse items_game with vdf (VDFDict preserves duplicate keys) ──────
    log.info('Parsing items_game.txt...')
    content = items_game_data.decode('utf-8')
    try:
        ig_parsed = vdflib.loads(content, mapper=vdflib.VDFDict)
        root = ig_parsed['items_game']
    except Exception as exc:
        log.error(f'vdf parse failed: {exc}')
        sys.exit(1)

    # ─── 4. Prefab helpers ────────────────────────────────────────────────────
    prefabs_section = root.get('prefabs', vdflib.VDFDict())

    # Build prefab → model_player (one-level + two-level resolution)
    prefab_models: dict[str, str] = {}
    for pname, pdata in prefabs_section.items():
        if not isinstance(pdata, dict):
            continue
        m = pdata.get('model_player', '')
        if m and 'model' in m:
            prefab_models[pname] = m

    def resolve_model(prefab_ref: str) -> str | None:
        parts = str(prefab_ref).split()
        # Direct lookup
        for p in parts:
            if p in prefab_models:
                return prefab_models[p]
        # One-level parent
        for p in parts:
            pdata = prefabs_section.get(p, {})
            if not isinstance(pdata, dict):
                continue
            parent = pdata.get('prefab', '')
            for pp in str(parent).split():
                if pp in prefab_models:
                    return prefab_models[pp]
        return None

    def prefab_resolves_to(prefab_name: str, keyword: str, depth: int = 0) -> bool:
        if depth > 6:
            return False
        if keyword in prefab_name.lower():
            return True
        pdata = prefabs_section.get(prefab_name, {})
        if not isinstance(pdata, dict):
            return False
        parent = pdata.get('prefab', '')
        for part in str(parent).split():
            if prefab_resolves_to(part, keyword, depth + 1):
                return True
        return False

    # ─── 5. Parse paint_kits ──────────────────────────────────────────────────
    paint_kits: dict[int, dict] = {}
    for kid_str, kit in root.get('paint_kits', vdflib.VDFDict()).items():
        if not isinstance(kit, dict):
            continue
        try:
            kit_id = int(kid_str)
        except ValueError:
            continue
        name = kit.get('name', '')
        if not name or name == 'default':
            continue
        paint_kits[kit_id] = {
            'id': kit_id,
            'name': name,
            'style': str(kit.get('style', '2')),
            'wearMin': float(kit.get('wear_remap_min', 0.0)),
            'wearMax': float(kit.get('wear_remap_max', 1.0)),
            'descTag': kit.get('description_tag', '').lstrip('#'),
            'compmatPath': kit.get('composite_material_path', ''),
        }
    log.info(f'Found {len(paint_kits):,} paint kits')

    # ─── 6. Parse paint_kits_rarity ───────────────────────────────────────────
    kit_rarity: dict[str, str] = {}
    for k, v in root.get('paint_kits_rarity', vdflib.VDFDict()).items():
        if isinstance(v, str):
            kit_rarity[k] = v
    log.info(f'Found {len(kit_rarity):,} kit rarity entries')

    # ─── 7. Kit-weapon mappings from loot lists & item_sets ───────────────────
    kit_to_weapons: dict[str, set[str]] = {}

    def scan_kit_weapon_keys(d: dict) -> None:
        for k, v in d.items():
            m = KIT_WEAPON_RE.match(str(k))
            if m:
                kit_to_weapons.setdefault(m.group(1), set()).add(m.group(2))
            elif isinstance(v, dict):
                scan_kit_weapon_keys(v)

    for section_name in ('client_loot_lists', 'revolving_loot_lists', 'item_sets'):
        sec = root.get(section_name, {})
        if isinstance(sec, dict):
            scan_kit_weapon_keys(sec)

    log.info(f'Found {len(kit_to_weapons):,} unique kit-weapon mappings')

    # ─── 8. Parse items: weapons + knives + gloves ────────────────────────────
    weapon_defs: dict[str, dict] = {}  # internal_name → {defIndex, modelPath, category}

    for def_str, item in root.get('items', vdflib.VDFDict()).items():
        if not isinstance(item, dict):
            continue
        try:
            def_idx = int(def_str)
        except ValueError:
            continue
        name = item.get('name', '')
        prefab_ref = str(item.get('prefab', ''))
        if not name:
            continue

        parts = prefab_ref.split()
        is_knife = (
            any(kw in name.lower() for kw in ('knife', 'bayonet')) or
            any(prefab_resolves_to(p, 'knife') or prefab_resolves_to(p, 'melee') for p in parts)
        )
        is_glove = (
            any(kw in name.lower() for kw in ('glove', 'handwrap')) or
            any(prefab_resolves_to(p, 'hands') for p in parts)
        )
        is_weapon = name.startswith('weapon_')

        if not (is_weapon or is_knife or is_glove):
            continue

        model_path = resolve_model(prefab_ref) or item.get('model_player', '')
        if not model_path:
            continue

        category = WEAPON_CATEGORIES.get(name)
        if category is None:
            category = 'knives' if is_knife else ('gloves' if is_glove else 'rifles')

        weapon_defs[name] = {
            'defIndex': def_idx,
            'modelPath': model_path,
            'category': category,
        }
        if name not in WEAPON_DISPLAY_NAMES:
            WEAPON_DISPLAY_NAMES[name] = name.replace('weapon_', '').replace('_', ' ').title()
        if name not in WEAPON_CATEGORIES:
            WEAPON_CATEGORIES[name] = category

    n_knives = sum(1 for d in weapon_defs.values() if d['category'] == 'knives')
    n_gloves = sum(1 for d in weapon_defs.values() if d['category'] == 'gloves')
    log.info(f'Found {len(weapon_defs)} weapon defs ({n_knives} knives, {n_gloves} gloves)')

    # ─── 9. Scan VPK for skin icon files ─────────────────────────────────────
    # Path pattern: panorama/images/econ/default_generated/{weapon}_{kit}_light_png.vtex_c
    # Note: VPKFile.glob does NOT support ** recursive patterns — use flat *.vtex_c
    log.info('Scanning VPK for skin icons...')
    icon_vpk_map: dict[tuple[str, str], str] = {}  # (weapon_internal, kit_name) → vpk_path
    try:
        icon_files = list(vpk.glob('panorama/images/econ/default_generated/*.vtex_c'))
        log.info(f'  Found {len(icon_files):,} icon files')
        for ipath, _ in icon_files:
            stem = Path(ipath).stem  # e.g. weapon_ak47_cu_ak47_rubber_light_png
            if not stem.endswith('_light_png'):
                continue
            core = stem[:-len('_light_png')]  # weapon_ak47_cu_ak47_rubber
            # Find longest matching weapon name
            matched: str | None = None
            for wname in weapon_defs:
                if core.startswith(wname + '_') or core == wname:
                    if matched is None or len(wname) > len(matched):
                        matched = wname
            if matched:
                kit_part = core[len(matched) + 1:]
                icon_vpk_map[(matched, kit_part)] = ipath
                # Knife/glove skins don't appear in loot list mappings — derive from icons
                wcat = weapon_defs[matched]['category']
                if wcat in ('knives', 'gloves') and kit_part:
                    kit_to_weapons.setdefault(kit_part, set()).add(matched)
    except Exception as exc:
        log.warning(f'  Icon scan failed: {exc}')
    log.info(f'  Mapped {len(icon_vpk_map):,} skin icons')

    # ─── 10. Localized skin name helper ───────────────────────────────────────
    name_to_kit_id: dict[str, int] = {v['name']: k for k, v in paint_kits.items()}

    def get_skin_name(kit_id: int, weapon_display: str) -> str:
        kit = paint_kits.get(kit_id, {})
        desc_tag = kit.get('descTag', '')
        sub_name: str | None = None
        if desc_tag:
            sub_name = loca_tokens.get(desc_tag) or loca_tokens.get(desc_tag.lower())
        if not sub_name:
            raw = kit.get('name', '')
            sub_name = re.sub(r'^[a-z]{2}_', '', raw).replace('_', ' ').title()
        return f'{weapon_display} | {sub_name}'

    # ─── 11. Build skins catalogue ────────────────────────────────────────────
    skins_catalogue: list[dict] = []
    for kit_name, weapon_classes in kit_to_weapons.items():
        kit_id = name_to_kit_id.get(kit_name)
        if kit_id is None:
            continue
        kit = paint_kits[kit_id]
        rarity = kit_rarity.get(kit_name, 'common')
        finish = ITEMS_FINISH_STYLE.get(kit['style'], 'hydrographic')
        for weapon_class in weapon_classes:
            wdef = weapon_defs.get(weapon_class)
            if wdef is None:
                continue
            weapon_display = WEAPON_DISPLAY_NAMES.get(weapon_class, weapon_class)
            skin_name = get_skin_name(kit_id, weapon_display)
            # Pre-compute local icon path (extracted in step 13)
            has_icon = (weapon_class, kit_name) in icon_vpk_map
            icon_path = f'kits/{kit_id}/{wdef["defIndex"]}_icon.webp' if has_icon else None
            skins_catalogue.append({
                'weaponDefIndex': wdef['defIndex'],
                'paintKitId': kit_id,
                'kitName': kit_name,
                'name': skin_name,
                'rarity': rarity,
                'finishStyle': finish,   # may be overridden by vmat F_PAINT_STYLE below
                'wearMin': kit['wearMin'],
                'wearMax': kit['wearMax'],
                'iconPath': icon_path,
                'colorA': None, 'colorB': None, 'colorC': None, 'colorD': None,
                'colorWarp': 0.0, 'phase': 0.0,
            })

    log.info(f'Catalogue: {len(skins_catalogue):,} skins')

    # Index by kit_id for vmat color param updates
    skins_by_kit: dict[int, list[dict]] = {}
    for s in skins_catalogue:
        skins_by_kit.setdefault(s['paintKitId'], []).append(s)

    # ─── 12. Texture helpers ───────────────────────────────────────────────────
    def _get_vcompmat_textures(mat: 'CompiledMaterialResource') -> dict:
        """Extract texture runtime paths from a vcompmat resource.
        Returns {param_name: vtex_c_path} for pattern and metalness textures.
        The returned paths are already the compiled vtex_c paths (no _c suffix needed)."""
        result: dict[str, str] = {}
        try:
            d = mat.data_block.to_dict()
            proc = d['m_Points'][0]['m_vecCompositeMaterialAssemblyProcedures'][0]
            for container in proc.get('m_vecCompositeInputContainers', []):
                for var in container.get('m_vecLooseVariables', []):
                    name = var.get('m_strName', '')
                    runtime = var.get('m_strTextureRuntimeResourcePath', '')
                    if runtime and name in ('g_tPattern', 'g_tPaintMetalness', 'g_tPaintRoughness'):
                        # Runtime path is e.g. "items/assets/.../albedo.vtex"
                        # Compiled version adds _c: "items/assets/.../albedo.vtex_c"
                        result[name] = runtime + '_c'
        except Exception:
            pass
        return result

    def extract_texture(vpk_path: str, out_path: Path) -> bool:
        if out_path.exists():
            return True
        data = vpk.find_file(vpk_path)
        if data is None:
            return False
        try:
            buf = MemoryBuffer(data)
            res = CompiledTextureResource.from_buffer(buf, TinyPath(vpk_path))
            img_data, _ = res.get_texture_data(0)
            if img_data.dtype != np.uint8:
                img_data = (np.clip(img_data, 0, 1) * 255).astype(np.uint8)
            channels = img_data.shape[-1] if img_data.ndim == 3 else 1
            if channels == 4:
                img = Image.fromarray(img_data, 'RGBA')
            elif channels == 3:
                img = Image.fromarray(img_data, 'RGB')
            else:
                img = Image.fromarray(img_data[:, :, 0], 'L')
            if img.width > MAX_SIZE or img.height > MAX_SIZE:
                img.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(str(out_path), 'WEBP', quality=90)
            return True
        except Exception as exc:
            log.debug(f'  Texture extract failed {vpk_path}: {exc}')
            return False

    # ─── 13. Extract paint kit textures + color params from vmats ─────────────
    filter_kits: set[int] | None = None
    if args.kits:
        filter_kits = {int(k) for k in args.kits.split(',')}

    vmats_base = 'materials/models/weapons/customization/paints/vmats'
    grunge_done = False
    n_extracted = n_skipped = n_failed = 0

    unique_kit_ids = {s['paintKitId'] for s in skins_catalogue}
    if filter_kits:
        unique_kit_ids &= filter_kits

    log.info(f'Extracting textures for {len(unique_kit_ids):,} paint kits...')

    def _clamp_vec4(v: object) -> list[float]:
        if isinstance(v, (list, tuple)) and len(v) >= 3:
            vals = [float(x) for x in list(v)[:4]]
            while len(vals) < 4:
                vals.append(1.0)
            return vals
        return [1.0, 1.0, 1.0, 1.0]

    for kit_id in sorted(unique_kit_ids):
        kit = paint_kits.get(kit_id)
        if not kit:
            continue
        kit_name = kit['name']
        kit_dir = output / 'kits' / str(kit_id)

        vmat_path = f'{vmats_base}/{kit_name}.vmat_c'
        vmat_data = vpk.find_file(vmat_path)

        # Fallback: try composite material path (newer vcompmat format)
        use_vcompmat = False
        if vmat_data is None:
            compmat = kit.get('compmatPath', '')
            if compmat:
                vcompmat_path = compmat + '_c'
                vmat_data = vpk.find_file(vcompmat_path)
                if vmat_data is not None:
                    vmat_path = vcompmat_path
                    use_vcompmat = True

        if vmat_data is None:
            n_skipped += 1
            continue

        try:
            mat = CompiledMaterialResource.from_buffer(
                MemoryBuffer(vmat_data), TinyPath(vmat_path)
            )
            if use_vcompmat:
                textures = _get_vcompmat_textures(mat)
            else:
                textures = mat.get_used_textures()
        except Exception as exc:
            log.debug(f'  vmat parse failed {kit_name}: {exc}')
            n_failed += 1
            continue

        # Pattern texture
        pat_key = 'g_tPattern'
        if pat := textures.get(pat_key):
            tex_path = (pat + '_c') if not use_vcompmat else pat
            if extract_texture(tex_path, kit_dir / 'pattern.webp'):
                n_extracted += 1

        # Metalness texture (stored as roughness.webp for DB compat)
        metal_key = 'g_tPaintMetalness' if use_vcompmat else 'g_tMetalness'
        if metal := textures.get(metal_key):
            tex_path = (metal + '_c') if not use_vcompmat else metal
            if extract_texture(tex_path, kit_dir / 'roughness.webp'):
                n_extracted += 1

        # Shared grunge (extract once, only from vmat — vcompmat uses per-skin grunge)
        if not grunge_done and not use_vcompmat:
            if grunge := textures.get('g_tGrunge'):
                if extract_texture(grunge + '_c', output / 'shared' / 'grunge.webp'):
                    grunge_done = True

        # Color params from vmat material data (vcompmat skins use pattern as albedo — no color params)
        if not use_vcompmat:
            try:
                mat_dict = mat.data_block.to_dict()
                int_p = {p['m_name']: p['m_nValue'] for p in mat_dict.get('m_intParams', [])}
                float_p = {p['m_name']: p['m_flValue'] for p in mat_dict.get('m_floatParams', [])}
                vec_p = {p['m_name']: p['m_value'] for p in mat_dict.get('m_vectorParams', [])}

                f_style = int(int_p.get('F_PAINT_STYLE', 0))
                finish_from_vmat = VMAT_FINISH_STYLE.get(f_style, 'hydrographic')

                color_a = _clamp_vec4(vec_p.get('g_vColor0'))
                color_b = _clamp_vec4(vec_p.get('g_vColor1'))
                color_c = _clamp_vec4(vec_p.get('g_vColor2'))
                color_d = _clamp_vec4(vec_p.get('g_vColor3'))
                color_warp = float(float_p.get('g_flColorBrightness', 0.0))
                phase = float(float_p.get('g_flPhase', 0.0))

                for entry in skins_by_kit.get(kit_id, []):
                    entry['finishStyle'] = finish_from_vmat
                    entry['colorA'] = color_a
                    entry['colorB'] = color_b
                    entry['colorC'] = color_c
                    entry['colorD'] = color_d
                    entry['colorWarp'] = color_warp
                    entry['phase'] = phase
            except Exception as exc:
                log.debug(f'  Color params failed {kit_name}: {exc}')
        else:
            # vcompmat skins: pattern IS the albedo texture, render as spray-paint
            for entry in skins_by_kit.get(kit_id, []):
                entry['finishStyle'] = 'spray-paint'

    log.info(f'Textures: {n_extracted} extracted, {n_skipped} no-vmat, {n_failed} failed')

    # ─── 14. Extract skin icons ───────────────────────────────────────────────
    log.info('Extracting skin icons...')
    n_icons = n_icons_fail = 0
    for (weapon_class, kit_name_key), icon_vpk_path in icon_vpk_map.items():
        kit_id = name_to_kit_id.get(kit_name_key)
        if kit_id is None:
            continue
        if filter_kits and kit_id not in filter_kits:
            continue
        wdef = weapon_defs.get(weapon_class)
        if wdef is None:
            continue
        out_path = output / 'kits' / str(kit_id) / f'{wdef["defIndex"]}_icon.webp'
        if out_path.exists():
            n_icons += 1
            continue
        raw = vpk.find_file(icon_vpk_path)
        if raw is None:
            n_icons_fail += 1
            continue
        try:
            buf = MemoryBuffer(raw)
            res = CompiledTextureResource.from_buffer(buf, TinyPath(icon_vpk_path))
            img_data, _ = res.get_texture_data(0)
            if img_data.dtype != np.uint8:
                img_data = (np.clip(img_data, 0, 1) * 255).astype(np.uint8)
            channels = img_data.shape[-1] if img_data.ndim == 3 else 1
            if channels == 4:
                img = Image.fromarray(img_data, 'RGBA')
            elif channels == 3:
                img = Image.fromarray(img_data, 'RGB')
            else:
                img = Image.fromarray(img_data[:, :, 0], 'L')
            out_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(str(out_path), 'WEBP', quality=85)
            n_icons += 1
        except Exception as exc:
            log.debug(f'  Icon failed {icon_vpk_path}: {exc}')
            n_icons_fail += 1

    log.info(f'Icons: {n_icons} extracted, {n_icons_fail} failed')

    # ─── 15. Write skins catalogue ────────────────────────────────────────────
    catalogue_path = output / 'skins_catalogue.json'
    catalogue_path.write_text(json.dumps(skins_catalogue, indent=2))
    log.info(f'Wrote {len(skins_catalogue):,} skins → {catalogue_path}')

    # ─── 16. Write weapons catalogue ──────────────────────────────────────────
    skinned_def_indices = {s['weaponDefIndex'] for s in skins_catalogue}
    weapons_catalogue = []
    for internal_name, wdef in weapon_defs.items():
        if wdef['defIndex'] not in skinned_def_indices:
            continue
        weapons_catalogue.append({
            'defIndex': wdef['defIndex'],
            'name': WEAPON_DISPLAY_NAMES.get(internal_name, internal_name),
            'internalName': internal_name,
            'category': wdef['category'],
            'modelPath': wdef['modelPath'],
        })
    weapons_catalogue.sort(key=lambda w: w['defIndex'])
    weapons_path = output / 'weapons_catalogue.json'
    weapons_path.write_text(json.dumps(weapons_catalogue, indent=2))
    log.info(f'Wrote {len(weapons_catalogue)} weapons → {weapons_path}')

    log.info('Pipeline complete.')


if __name__ == '__main__':
    main()
