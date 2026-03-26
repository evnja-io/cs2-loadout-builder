# CS2 Loadout Builder — Plan 3: Builder UI & Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete SvelteKit frontend — the CS2-style loadout builder UI (weapon grid sidebar, skin catalogue, viewer controls), Steam inventory import, price display, loadout save/share, and public profile pages.

**Architecture:** Svelte 5 runes (`$state`, `$derived`, `$effect`) for all reactivity. The builder uses three panels: weapon grid sidebar (CS2 inventory style), centered 3D viewer (from Plan 2), and a skin catalogue modal/panel. Loadout state is managed in a single `loadout.svelte.ts` store. API calls use the typed `apiFetch` wrapper from Plan 1.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Threlte (Plan 2 viewer), Tailwind CSS v4, Vitest + Svelte Testing Library

**Prerequisites:** Plans 1 and 2 complete.

**Spec:** `docs/superpowers/specs/2026-03-24-cs2-loadout-builder-design.md`

---

## File Map

```
apps/web/src/
├── lib/
│   ├── api/
│   │   ├── client.ts                   # (Plan 1) base fetch
│   │   ├── loadouts.ts                 # typed loadout API calls
│   │   ├── weapons.ts                  # typed weapons/skins API calls
│   │   └── prices.ts                   # typed price API calls
│   ├── stores/
│   │   ├── auth.svelte.ts              # $state: current user
│   │   ├── loadout.svelte.ts           # $state: active loadout + slots
│   │   └── viewer.svelte.ts            # (Plan 2) wear/seed/selectedSkin
│   └── components/
│       ├── WeaponCategoryTabs.svelte   # CS2-style category tab bar
│       ├── WeaponGrid.svelte           # weapon icon grid per category
│       ├── SkinCatalogue.svelte        # searchable skin grid modal
│       ├── SkinCard.svelte             # single skin card with preview image
│       ├── WearControls.svelte         # wear slider + seed input + StatTrak toggle
│       ├── PriceDisplay.svelte         # Steam/CSFloat/Bitskin price badges
│       ├── LoadoutHeader.svelte        # loadout name + share button + loadout switcher
│       └── ShareModal.svelte           # share link copy + like display
├── routes/
│   ├── +layout.svelte                  # (Plan 1) root layout — add nav/auth display
│   ├── builder/
│   │   ├── +page.ts                    # auth guard (Plan 2)
│   │   └── +page.svelte                # full builder — replaces Plan 2 stub
│   ├── share/
│   │   └── [slug]/
│   │       ├── +page.ts                # load public loadout by slug
│   │       └── +page.svelte            # read-only viewer + skin info
│   └── u/
│       └── [steamId]/
│           ├── +page.ts                # load public loadouts for user
│           └── +page.svelte            # profile page with loadout grid
```

---

## Task 1: API Client Modules

**Files:**
- Create: `apps/web/src/lib/api/loadouts.ts`
- Create: `apps/web/src/lib/api/weapons.ts`
- Create: `apps/web/src/lib/api/prices.ts`
- Test: `apps/web/src/lib/api/__tests__/api.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/api/__tests__/api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the base client
vi.mock('../client.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../client.js';
import { getLoadouts, createLoadout, updateLoadoutSlots } from '../loadouts.js';
import { getWeapons, getSkinsForWeapon } from '../weapons.js';

const mockFetch = vi.mocked(apiFetch);

beforeEach(() => { vi.clearAllMocks(); });

describe('getLoadouts', () => {
  it('calls GET /loadouts', async () => {
    mockFetch.mockResolvedValue([]);
    await getLoadouts();
    expect(mockFetch).toHaveBeenCalledWith('/loadouts');
  });
});

describe('createLoadout', () => {
  it('calls POST /loadouts with name', async () => {
    mockFetch.mockResolvedValue({ id: 'abc', name: 'Test' });
    await createLoadout('My Loadout');
    expect(mockFetch).toHaveBeenCalledWith('/loadouts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'My Loadout' }),
    }));
  });
});

describe('getWeapons', () => {
  it('calls GET /weapons', async () => {
    mockFetch.mockResolvedValue({ rifles: [], pistols: [] });
    await getWeapons();
    expect(mockFetch).toHaveBeenCalledWith('/weapons');
  });
});

describe('getSkinsForWeapon', () => {
  it('builds correct URL with filters', async () => {
    mockFetch.mockResolvedValue([]);
    await getSkinsForWeapon(7, { rarity: 'covert' });
    expect(mockFetch).toHaveBeenCalledWith('/weapons/7/skins?rarity=covert');
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

```bash
pnpm --filter @lb/web test src/lib/api/__tests__/api.test.ts
```

- [ ] **Step 3: Create apps/web/src/lib/api/weapons.ts**

```typescript
import { apiFetch } from './client.js';
import type { Weapon, Skin } from '@lb/shared';

export async function getWeapons(): Promise<Record<string, Weapon[]>> {
  return apiFetch('/weapons');
}

export async function getSkinsForWeapon(
  defIndex: number,
  filters?: { rarity?: string; maxPrice?: number }
): Promise<Skin[]> {
  const params = new URLSearchParams();
  if (filters?.rarity) params.set('rarity', filters.rarity);
  if (filters?.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  const qs = params.size > 0 ? `?${params}` : '';
  return apiFetch(`/weapons/${defIndex}/skins${qs}`);
}
```

- [ ] **Step 4: Create apps/web/src/lib/api/loadouts.ts**

```typescript
import { apiFetch } from './client.js';
import type { Loadout, UpsertSlot } from '@lb/shared';

export async function getLoadouts(): Promise<Loadout[]> {
  return apiFetch('/loadouts');
}

export async function createLoadout(name: string): Promise<Loadout> {
  return apiFetch('/loadouts', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function updateLoadout(id: string, patch: { name?: string; isPublic?: boolean }): Promise<Loadout> {
  return apiFetch(`/loadouts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteLoadout(id: string): Promise<void> {
  return apiFetch(`/loadouts/${id}`, { method: 'DELETE' });
}

export async function updateLoadoutSlots(id: string, slots: UpsertSlot[]): Promise<{ ok: boolean }> {
  return apiFetch(`/loadouts/${id}/slots`, { method: 'PUT', body: JSON.stringify({ slots }) });
}

export async function getSharedLoadout(slug: string): Promise<Loadout> {
  return apiFetch(`/share/${slug}`);
}

export async function getUserLoadouts(steamId: string): Promise<Loadout[]> {
  return apiFetch(`/users/${steamId}/loadouts`);
}

export async function toggleLike(loadoutId: string): Promise<{ liked: boolean }> {
  return apiFetch(`/loadouts/${loadoutId}/like`, { method: 'POST' });
}
```

- [ ] **Step 5: Create apps/web/src/lib/api/prices.ts**

```typescript
import { apiFetch } from './client.js';
import type { PriceData, PriceSource } from '@lb/shared';

export async function getPrices(
  skinId: number,
  sources: PriceSource[] = ['steam', 'csfloat', 'bitskin']
): Promise<PriceData[]> {
  const params = new URLSearchParams({
    skinId: String(skinId),
    sources: sources.join(','),
  });
  return apiFetch(`/prices?${params}`);
}
```

- [ ] **Step 6: Run tests (expect pass)**

```bash
pnpm --filter @lb/web test src/lib/api/__tests__/api.test.ts
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/api
git commit -m "feat(web): add typed API client modules for all endpoints"
```

---

## Task 2: Auth + Loadout Stores

**Files:**
- Create: `apps/web/src/lib/stores/auth.svelte.ts`
- Modify: `apps/web/src/lib/stores/loadout.svelte.ts` (create)
- Test: `apps/web/src/lib/stores/__tests__/loadout.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/lib/stores/__tests__/loadout.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('../../api/loadouts.js', () => ({
  updateLoadoutSlots: vi.fn().mockResolvedValue({ ok: true }),
}));

// Test loadout store logic in isolation
describe('loadout store', () => {
  it('setSlot adds a slot for a weapon', async () => {
    const { loadoutStore } = await import('../loadout.svelte.js');
    loadoutStore.setActiveLoadout({ id: 'test-id', name: 'Test', isPublic: false, shareSlug: null, likesCount: 0, slots: [], userId: 'x', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    loadoutStore.setSlot({ weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 500, statTrak: false });
    expect(loadoutStore.slots.find(s => s.weaponDefIndex === 7)).toBeDefined();
  });

  it('removeSlot removes a weapon slot', () => {
    const { loadoutStore } = require('../loadout.svelte.js');
    loadoutStore.removeSlot(7);
    expect(loadoutStore.slots.find((s: any) => s.weaponDefIndex === 7)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Create apps/web/src/lib/stores/auth.svelte.ts**

```typescript
import type { User } from '@lb/shared';
import { apiFetch } from '../api/client.js';

export const authStore = $state<{
  user: User | null;
  loading: boolean;
}>({ user: null, loading: true });

export async function loadCurrentUser(): Promise<void> {
  try {
    authStore.user = await apiFetch<User>('/auth/me');
  } catch {
    authStore.user = null;
  } finally {
    authStore.loading = false;
  }
}

export function logout(): void {
  authStore.user = null;
  fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/auth/logout`, {
    method: 'POST', credentials: 'include',
  });
}
```

- [ ] **Step 3: Create apps/web/src/lib/stores/loadout.svelte.ts**

```typescript
import type { Loadout, UpsertSlot } from '@lb/shared';
import { updateLoadoutSlots } from '../api/loadouts.js';

interface LoadoutStore {
  activeLoadout: Loadout | null;
  slots: UpsertSlot[];
  saving: boolean;
  dirty: boolean;
}

export const loadoutStore = $state<LoadoutStore>({
  activeLoadout: null,
  slots: [],
  saving: false,
  dirty: false,
});

Object.assign(loadoutStore, {
  setActiveLoadout(loadout: Loadout) {
    loadoutStore.activeLoadout = loadout;
    loadoutStore.slots = loadout.slots.map(s => ({
      weaponDefIndex: s.weaponDefIndex,
      skinId: s.skinId,
      wear: s.wear,
      seed: s.seed,
      statTrak: s.statTrak,
    }));
    loadoutStore.dirty = false;
  },

  setSlot(slot: UpsertSlot) {
    const idx = loadoutStore.slots.findIndex(s => s.weaponDefIndex === slot.weaponDefIndex);
    if (idx >= 0) loadoutStore.slots[idx] = slot;
    else loadoutStore.slots.push(slot);
    loadoutStore.dirty = true;
  },

  removeSlot(weaponDefIndex: number) {
    loadoutStore.slots = loadoutStore.slots.filter(s => s.weaponDefIndex !== weaponDefIndex);
    loadoutStore.dirty = true;
  },

  async save() {
    if (!loadoutStore.activeLoadout || !loadoutStore.dirty) return;
    loadoutStore.saving = true;
    try {
      await updateLoadoutSlots(loadoutStore.activeLoadout.id, loadoutStore.slots);
      loadoutStore.dirty = false;
    } finally {
      loadoutStore.saving = false;
    }
  },
});
```

- [ ] **Step 4: Run tests (expect pass)**

```bash
pnpm --filter @lb/web test src/lib/stores/__tests__/loadout.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/stores
git commit -m "feat(web): add auth and loadout Svelte 5 rune stores"
```

---

## Task 3: WeaponCategoryTabs + WeaponGrid

**Files:**
- Create: `apps/web/src/lib/components/WeaponCategoryTabs.svelte`
- Create: `apps/web/src/lib/components/WeaponGrid.svelte`

- [ ] **Step 1: Create WeaponCategoryTabs.svelte**

```svelte
<script lang="ts">
  import type { WeaponCategory } from '@lb/shared';

  const CATEGORIES: { key: WeaponCategory; label: string }[] = [
    { key: 'gloves', label: 'Équipement' },
    { key: 'knives', label: 'Couteaux' },
    { key: 'pistols', label: 'Pistolets' },
    { key: 'smgs', label: 'Milieu de gamme' },
    { key: 'rifles', label: 'Fusils' },
    { key: 'shotguns', label: 'Fusils à pompe' },
    { key: 'heavies', label: 'Mitrailleuses' },
  ];

  interface Props {
    activeCategory: WeaponCategory;
    onSelect: (cat: WeaponCategory) => void;
  }

  let { activeCategory, onSelect }: Props = $props();
</script>

<div class="flex border-b border-gray-800 overflow-x-auto scrollbar-thin">
  {#each CATEGORIES as cat}
    <button
      onclick={() => onSelect(cat.key)}
      class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
             {activeCategory === cat.key
               ? 'text-white border-b-2 border-orange-500 bg-gray-800/50'
               : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}"
    >
      {cat.label}
    </button>
  {/each}
</div>
```

- [ ] **Step 2: Create WeaponGrid.svelte**

```svelte
<script lang="ts">
  import type { Weapon } from '@lb/shared';

  interface Props {
    weapons: Weapon[];
    selectedDefIndex: number | null;
    equippedDefIndexes: number[];
    onSelect: (weapon: Weapon) => void;
    assetsBase?: string;
  }

  let {
    weapons,
    selectedDefIndex,
    equippedDefIndexes,
    onSelect,
    assetsBase = import.meta.env.VITE_ASSETS_BASE_URL ?? '/assets',
  }: Props = $props();
</script>

<div class="grid grid-cols-4 gap-1 p-2">
  {#each weapons as weapon}
    {@const isSelected = weapon.defIndex === selectedDefIndex}
    {@const isEquipped = equippedDefIndexes.includes(weapon.defIndex)}
    <button
      onclick={() => onSelect(weapon)}
      class="relative aspect-square flex flex-col items-center justify-center p-2 rounded
             transition-all border
             {isSelected
               ? 'border-orange-500 bg-orange-500/10'
               : isEquipped
                 ? 'border-gray-600 bg-gray-800/60'
                 : 'border-transparent bg-gray-800/30 hover:bg-gray-800/60 hover:border-gray-600'}"
      title={weapon.name}
    >
      {#if weapon.iconPath}
        <img
          src="{assetsBase}/{weapon.iconPath}"
          alt={weapon.name}
          class="w-full h-full object-contain opacity-70 {isSelected ? 'opacity-100' : ''}"
        />
      {:else}
        <div class="w-8 h-8 bg-gray-700 rounded opacity-50"></div>
      {/if}

      {#if isEquipped}
        <span class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-400"></span>
      {/if}
    </button>
  {/each}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/components/WeaponCategoryTabs.svelte apps/web/src/lib/components/WeaponGrid.svelte
git commit -m "feat(web): add CS2-style weapon category tabs and weapon grid"
```

---

## Task 4: SkinCatalogue + SkinCard

**Files:**
- Create: `apps/web/src/lib/components/SkinCard.svelte`
- Create: `apps/web/src/lib/components/SkinCatalogue.svelte`

- [ ] **Step 1: Create SkinCard.svelte**

```svelte
<script lang="ts">
  import type { Skin } from '@lb/shared';

  const RARITY_COLORS: Record<string, string> = {
    consumer: 'border-gray-500', industrial: 'border-blue-500',
    'mil-spec': 'border-blue-400', restricted: 'border-purple-500',
    classified: 'border-pink-500', covert: 'border-red-500', contraband: 'border-yellow-500',
  };

  interface Props {
    skin: Skin;
    isSelected: boolean;
    onSelect: (skin: Skin) => void;
    assetsBase?: string;
  }

  let { skin, isSelected, onSelect, assetsBase = import.meta.env.VITE_ASSETS_BASE_URL ?? '/assets' }: Props = $props();
  const rarityBorder = $derived(RARITY_COLORS[skin.rarity] ?? 'border-gray-500');
</script>

<button
  onclick={() => onSelect(skin)}
  class="group relative bg-gray-800 rounded-lg overflow-hidden border-2 transition-all
         {isSelected ? 'border-orange-500 ring-1 ring-orange-400' : `${rarityBorder} hover:brightness-110`}"
>
  {#if skin.colorTexture}
    <img
      src="{assetsBase}/{skin.colorTexture}"
      alt={skin.name}
      class="w-full aspect-video object-cover"
      loading="lazy"
    />
  {:else}
    <div class="w-full aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
      <span class="text-gray-500 text-xs">{skin.finishStyle}</span>
    </div>
  {/if}
  <div class="p-2">
    <p class="text-xs font-medium text-white truncate">{skin.name}</p>
    <p class="text-xs text-gray-400 capitalize">{skin.rarity}</p>
  </div>
</button>
```

- [ ] **Step 2: Create SkinCatalogue.svelte**

```svelte
<script lang="ts">
  import type { Skin } from '@lb/shared';
  import SkinCard from './SkinCard.svelte';
  import { getSkinsForWeapon } from '$lib/api/weapons.js';

  interface Props {
    weaponDefIndex: number;
    weaponName: string;
    selectedSkinId: number | null;
    onSelect: (skin: Skin) => void;
    onClose: () => void;
  }

  let { weaponDefIndex, weaponName, selectedSkinId, onSelect, onClose }: Props = $props();

  let search = $state('');
  let rarityFilter = $state('');
  let skins = $state<Skin[]>([]);
  let loading = $state(true);

  // Load skins when weapon changes
  $effect(() => {
    loading = true;
    getSkinsForWeapon(weaponDefIndex, rarityFilter ? { rarity: rarityFilter } : undefined)
      .then(data => { skins = data; loading = false; });
  });

  let filtered = $derived(
    search
      ? skins.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      : skins
  );

  const RARITIES = ['consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'contraband'];
</script>

<div class="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4" onclick={onClose}>
  <div
    class="bg-gray-900 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl"
    onclick|stopPropagation
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-800">
      <h2 class="text-white font-semibold">Choose skin — {weaponName}</h2>
      <button onclick={onClose} class="text-gray-400 hover:text-white text-xl leading-none">×</button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 p-4 border-b border-gray-800">
      <input
        type="search"
        placeholder="Search skins..."
        bind:value={search}
        class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
      />
      <select
        bind:value={rarityFilter}
        class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
      >
        <option value="">All rarities</option>
        {#each RARITIES as r}
          <option value={r} class="capitalize">{r}</option>
        {/each}
      </select>
    </div>

    <!-- Grid -->
    <div class="flex-1 overflow-y-auto p-4">
      {#if loading}
        <div class="flex justify-center py-12">
          <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      {:else if filtered.length === 0}
        <p class="text-center text-gray-500 py-12">No skins found</p>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {#each filtered as skin}
            <SkinCard
              {skin}
              isSelected={skin.id === selectedSkinId}
              onSelect={(s) => { onSelect(s); onClose(); }}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/components/SkinCard.svelte apps/web/src/lib/components/SkinCatalogue.svelte
git commit -m "feat(web): add skin catalogue with search and rarity filter"
```

---

## Task 5: WearControls + PriceDisplay

**Files:**
- Create: `apps/web/src/lib/components/WearControls.svelte`
- Create: `apps/web/src/lib/components/PriceDisplay.svelte`

- [ ] **Step 1: Create WearControls.svelte**

```svelte
<script lang="ts">
  const WEAR_LABELS = [
    { max: 0.07, label: 'Factory New', color: 'text-blue-400' },
    { max: 0.15, label: 'Minimal Wear', color: 'text-green-400' },
    { max: 0.38, label: 'Field-Tested', color: 'text-yellow-400' },
    { max: 0.45, label: 'Well-Worn', color: 'text-orange-400' },
    { max: 1.0,  label: 'Battle-Scarred', color: 'text-red-400' },
  ];

  interface Props {
    wear: number;
    seed: number;
    statTrak: boolean;
    wearMin?: number;
    wearMax?: number;
    onWearChange: (wear: number) => void;
    onSeedChange: (seed: number) => void;
    onStatTrakChange: (statTrak: boolean) => void;
  }

  let { wear, seed, statTrak, wearMin = 0, wearMax = 1, onWearChange, onSeedChange, onStatTrakChange }: Props = $props();

  const wearLabel = $derived(WEAR_LABELS.find(l => wear <= l.max) ?? WEAR_LABELS[WEAR_LABELS.length - 1]!);
</script>

<div class="flex flex-col gap-3 p-4 bg-gray-900/50 rounded-lg">
  <!-- Wear slider -->
  <div>
    <div class="flex justify-between items-center mb-1">
      <label class="text-xs text-gray-400 uppercase tracking-wide">Wear</label>
      <span class="text-xs font-medium {wearLabel.color}">{wearLabel.label} ({wear.toFixed(4)})</span>
    </div>
    <input
      type="range"
      min={wearMin} max={wearMax} step="0.0001"
      value={wear}
      oninput={(e) => onWearChange(parseFloat((e.target as HTMLInputElement).value))}
      class="w-full accent-orange-500"
    />
  </div>

  <!-- Seed + StatTrak -->
  <div class="flex gap-4 items-center">
    <div class="flex-1">
      <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1">Pattern Seed</label>
      <input
        type="number" min="1" max="1000"
        value={seed}
        onchange={(e) => onSeedChange(parseInt((e.target as HTMLInputElement).value, 10))}
        class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
      />
    </div>
    <label class="flex items-center gap-2 cursor-pointer mt-4">
      <input
        type="checkbox"
        checked={statTrak}
        onchange={(e) => onStatTrakChange((e.target as HTMLInputElement).checked)}
        class="accent-orange-500"
      />
      <span class="text-sm text-yellow-400 font-medium">StatTrak™</span>
    </label>
  </div>
</div>
```

- [ ] **Step 2: Create PriceDisplay.svelte**

```svelte
<script lang="ts">
  import type { PriceData } from '@lb/shared';
  import { getPrices } from '$lib/api/prices.js';

  interface Props {
    skinId: number;
  }

  let { skinId }: Props = $props();

  let prices = $state<PriceData[]>([]);
  let loading = $state(false);

  $effect(() => {
    loading = true;
    getPrices(skinId).then(data => { prices = data; loading = false; });
  });

  const SOURCE_CONFIG = {
    steam:   { label: 'Steam', color: 'text-blue-400', domain: 'store.steampowered.com' },
    csfloat: { label: 'CSFloat', color: 'text-green-400', domain: 'csfloat.com' },
    bitskin: { label: 'Bitskin', color: 'text-purple-400', domain: 'bitskins.com' },
  } as const;
</script>

<div class="flex gap-3 flex-wrap">
  {#if loading}
    <span class="text-xs text-gray-500">Loading prices…</span>
  {:else}
    {#each prices as p}
      {@const cfg = SOURCE_CONFIG[p.source as keyof typeof SOURCE_CONFIG]}
      {#if cfg}
        <a
          href={p.listingUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          class="flex flex-col items-center bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors no-underline"
        >
          <span class="text-xs text-gray-400">{cfg.label}</span>
          <span class="text-sm font-semibold {cfg.color}">
            {p.price != null ? `$${p.price.toFixed(2)}` : '—'}
          </span>
        </a>
      {/if}
    {/each}
  {/if}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/components/WearControls.svelte apps/web/src/lib/components/PriceDisplay.svelte
git commit -m "feat(web): add wear controls and price display components"
```

---

## Task 6: LoadoutHeader + ShareModal

**Files:**
- Create: `apps/web/src/lib/components/LoadoutHeader.svelte`
- Create: `apps/web/src/lib/components/ShareModal.svelte`

- [ ] **Step 1: Create LoadoutHeader.svelte**

```svelte
<script lang="ts">
  import type { Loadout } from '@lb/shared';
  import { updateLoadout } from '$lib/api/loadouts.js';

  interface Props {
    loadout: Loadout;
    allLoadouts: Loadout[];
    saving: boolean;
    dirty: boolean;
    onSwitch: (loadout: Loadout) => void;
    onSave: () => void;
    onShareOpen: () => void;
    onNewLoadout: () => void;
  }

  let { loadout, allLoadouts, saving, dirty, onSwitch, onSave, onShareOpen, onNewLoadout }: Props = $props();

  let editingName = $state(false);
  let nameInput = $state(loadout.name);

  async function saveName() {
    editingName = false;
    if (nameInput !== loadout.name) {
      await updateLoadout(loadout.id, { name: nameInput });
    }
  }
</script>

<div class="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
  <!-- Loadout switcher -->
  <select
    class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
    value={loadout.id}
    onchange={(e) => {
      const selected = allLoadouts.find(l => l.id === (e.target as HTMLSelectElement).value);
      if (selected) onSwitch(selected);
    }}
  >
    {#each allLoadouts as l}
      <option value={l.id}>{l.name}</option>
    {/each}
  </select>

  <button onclick={onNewLoadout} class="text-gray-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-gray-800">
    + New
  </button>

  <div class="flex-1"></div>

  <!-- Save indicator -->
  {#if dirty}
    <button
      onclick={onSave}
      disabled={saving}
      class="text-sm px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded transition-colors"
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
  {:else}
    <span class="text-xs text-gray-500">Saved</span>
  {/if}

  <!-- Share button -->
  <button
    onclick={onShareOpen}
    class="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
  >
    Share
  </button>
</div>
```

- [ ] **Step 2: Create ShareModal.svelte**

```svelte
<script lang="ts">
  import type { Loadout } from '@lb/shared';
  import { updateLoadout, toggleLike } from '$lib/api/loadouts.js';

  interface Props {
    loadout: Loadout;
    onClose: () => void;
    onUpdate: (updated: Loadout) => void;
  }

  let { loadout, onClose, onUpdate }: Props = $props();

  const shareUrl = $derived(
    loadout.shareSlug ? `${window.location.origin}/share/${loadout.shareSlug}` : null
  );

  let copied = $state(false);
  let isPublic = $state(loadout.isPublic);

  async function togglePublic() {
    const updated = await updateLoadout(loadout.id, { isPublic: !isPublic });
    isPublic = updated.isPublic;
    onUpdate(updated);
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }
</script>

<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onclick={onClose}>
  <div class="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl p-6" onclick|stopPropagation>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-white font-semibold text-lg">Share Loadout</h2>
      <button onclick={onClose} class="text-gray-400 hover:text-white text-xl">×</button>
    </div>

    <!-- Public toggle -->
    <label class="flex items-center justify-between mb-4 cursor-pointer">
      <div>
        <p class="text-white text-sm font-medium">Public loadout</p>
        <p class="text-gray-400 text-xs">Anyone with the link can view</p>
      </div>
      <button
        onclick={togglePublic}
        class="relative w-11 h-6 rounded-full transition-colors {isPublic ? 'bg-orange-500' : 'bg-gray-600'}"
      >
        <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform {isPublic ? 'translate-x-5' : ''}"></span>
      </button>
    </label>

    <!-- Share URL -->
    {#if shareUrl}
      <div class="flex gap-2">
        <input
          type="text"
          value={shareUrl}
          readonly
          class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none"
        />
        <button
          onclick={copyLink}
          class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    {:else}
      <p class="text-gray-500 text-sm">Enable public to get a share link.</p>
    {/if}

    <!-- Likes -->
    <div class="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-gray-400 text-sm">
      <span>❤ {loadout.likesCount} likes</span>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/components/LoadoutHeader.svelte apps/web/src/lib/components/ShareModal.svelte
git commit -m "feat(web): add loadout header with save/share and share modal"
```

---

## Task 7: Full Builder Page

**Files:**
- Modify: `apps/web/src/routes/builder/+page.svelte`

- [ ] **Step 1: Rewrite builder page with all components**

Replace `apps/web/src/routes/builder/+page.svelte`:

```svelte
<script lang="ts">
  import WeaponScene from '$lib/viewer/WeaponScene.svelte';
  import WeaponCategoryTabs from '$lib/components/WeaponCategoryTabs.svelte';
  import WeaponGrid from '$lib/components/WeaponGrid.svelte';
  import SkinCatalogue from '$lib/components/SkinCatalogue.svelte';
  import WearControls from '$lib/components/WearControls.svelte';
  import PriceDisplay from '$lib/components/PriceDisplay.svelte';
  import LoadoutHeader from '$lib/components/LoadoutHeader.svelte';
  import ShareModal from '$lib/components/ShareModal.svelte';
  import { viewerState } from '$lib/stores/viewer.svelte.js';
  import { loadoutStore } from '$lib/stores/loadout.svelte.js';
  import { authStore, loadCurrentUser } from '$lib/stores/auth.svelte.js';
  import { getLoadouts, createLoadout } from '$lib/api/loadouts.js';
  import { getWeapons } from '$lib/api/weapons.js';
  import type { Weapon, Skin, Loadout, WeaponCategory } from '@lb/shared';

  let activeCategory = $state<WeaponCategory>('rifles');
  let weapons = $state<Record<string, Weapon[]>>({});
  let catalogueWeapon = $state<Weapon | null>(null);
  let shareOpen = $state(false);
  let allLoadouts = $state<Loadout[]>([]);

  // On mount: load user, weapons, loadouts
  $effect(() => {
    (async () => {
      await loadCurrentUser();
      const [weaponData, loadoutData] = await Promise.all([getWeapons(), getLoadouts()]);
      weapons = weaponData;
      allLoadouts = loadoutData;

      if (loadoutData.length > 0) {
        loadoutStore.setActiveLoadout(loadoutData[0]!);
      } else {
        const newLoadout = await createLoadout('My Loadout');
        allLoadouts = [newLoadout];
        loadoutStore.setActiveLoadout(newLoadout);
      }
    })();
  });

  const activeWeapons = $derived(weapons[activeCategory] ?? []);
  const equippedDefIndexes = $derived(loadoutStore.slots.map(s => s.weaponDefIndex));
  const selectedSlot = $derived(
    viewerState.selectedWeapon
      ? loadoutStore.slots.find(s => s.weaponDefIndex === viewerState.selectedWeapon!.defIndex)
      : null
  );

  function selectWeapon(weapon: Weapon) {
    viewerState.selectedWeapon = weapon;
    viewerState.selectedSkin = null;
    // If weapon has a slot, restore its settings
    const slot = loadoutStore.slots.find(s => s.weaponDefIndex === weapon.defIndex);
    if (slot) {
      viewerState.wear = slot.wear;
      viewerState.seed = slot.seed;
    }
  }

  function openCatalogue(weapon: Weapon) {
    selectWeapon(weapon);
    catalogueWeapon = weapon;
  }

  function handleSkinSelect(skin: Skin) {
    viewerState.selectedSkin = skin;
    if (viewerState.selectedWeapon) {
      loadoutStore.setSlot({
        weaponDefIndex: viewerState.selectedWeapon.defIndex,
        skinId: skin.id,
        wear: viewerState.wear,
        seed: viewerState.seed,
        statTrak: viewerState.statTrak,
      });
    }
  }

  async function handleNewLoadout() {
    const name = prompt('Loadout name:');
    if (!name) return;
    const newLoadout = await createLoadout(name);
    allLoadouts = [...allLoadouts, newLoadout];
    loadoutStore.setActiveLoadout(newLoadout);
  }
</script>

<div class="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
  <!-- Header -->
  {#if loadoutStore.activeLoadout}
    <LoadoutHeader
      loadout={loadoutStore.activeLoadout}
      {allLoadouts}
      saving={loadoutStore.saving}
      dirty={loadoutStore.dirty}
      onSwitch={(l) => loadoutStore.setActiveLoadout(l)}
      onSave={() => loadoutStore.save()}
      onShareOpen={() => { shareOpen = true; }}
      onNewLoadout={handleNewLoadout}
    />
  {/if}

  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-72 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
      <WeaponCategoryTabs {activeCategory} onSelect={(cat) => { activeCategory = cat; }} />
      <div class="flex-1 overflow-y-auto">
        <WeaponGrid
          weapons={activeWeapons}
          selectedDefIndex={viewerState.selectedWeapon?.defIndex ?? null}
          {equippedDefIndexes}
          onSelect={(w) => openCatalogue(w)}
        />
      </div>
    </aside>

    <!-- Main area -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- 3D Viewer -->
      <div class="flex-1 p-4">
        <WeaponScene
          skin={viewerState.selectedSkin}
          wear={viewerState.wear}
          seed={viewerState.seed}
        />
      </div>

      <!-- Controls panel -->
      {#if viewerState.selectedSkin}
        <div class="border-t border-gray-800 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold">{viewerState.selectedSkin.name}</h3>
              <p class="text-sm text-gray-400 capitalize">{viewerState.selectedSkin.rarity} · {viewerState.selectedSkin.finishStyle}</p>
            </div>
            <button
              onclick={() => { if (viewerState.selectedWeapon) openCatalogue(viewerState.selectedWeapon); }}
              class="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              Change skin
            </button>
          </div>

          <WearControls
            wear={viewerState.wear}
            seed={viewerState.seed}
            statTrak={viewerState.statTrak}
            wearMin={viewerState.selectedSkin.wearMin}
            wearMax={viewerState.selectedSkin.wearMax}
            onWearChange={(w) => {
              viewerState.wear = w;
              if (selectedSlot) loadoutStore.setSlot({ ...selectedSlot, wear: w });
            }}
            onSeedChange={(s) => {
              viewerState.seed = s;
              if (selectedSlot) loadoutStore.setSlot({ ...selectedSlot, seed: s });
            }}
            onStatTrakChange={(st) => {
              viewerState.statTrak = st;
              if (selectedSlot) loadoutStore.setSlot({ ...selectedSlot, statTrak: st });
            }}
          />

          <PriceDisplay skinId={viewerState.selectedSkin.id} />
        </div>
      {/if}
    </main>
  </div>
</div>

<!-- Modals -->
{#if catalogueWeapon}
  <SkinCatalogue
    weaponDefIndex={catalogueWeapon.defIndex}
    weaponName={catalogueWeapon.name}
    selectedSkinId={viewerState.selectedSkin?.id ?? null}
    onSelect={handleSkinSelect}
    onClose={() => { catalogueWeapon = null; }}
  />
{/if}

{#if shareOpen && loadoutStore.activeLoadout}
  <ShareModal
    loadout={loadoutStore.activeLoadout}
    onClose={() => { shareOpen = false; }}
    onUpdate={(updated) => {
      loadoutStore.activeLoadout = updated;
      allLoadouts = allLoadouts.map(l => l.id === updated.id ? updated : l);
    }}
  />
{/if}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/builder
git commit -m "feat(web): complete builder page with all components integrated"
```

---

## Task 8: Share Page

**Files:**
- Modify: `apps/web/src/routes/share/[slug]/+page.ts`
- Modify: `apps/web/src/routes/share/[slug]/+page.svelte`

- [ ] **Step 1: Create +page.ts**

```typescript
import { getSharedLoadout } from '$lib/api/loadouts.js';
import { getWeapons } from '$lib/api/weapons.js';
import { error } from '@sveltejs/kit';

export async function load({ params }: { params: { slug: string } }) {
  try {
    const [loadout, weapons] = await Promise.all([
      getSharedLoadout(params.slug),
      getWeapons(),
    ]);
    return { loadout, weapons };
  } catch {
    error(404, 'Loadout not found');
  }
}
```

- [ ] **Step 2: Create +page.svelte**

```svelte
<script lang="ts">
  import WeaponScene from '$lib/viewer/WeaponScene.svelte';
  import PriceDisplay from '$lib/components/PriceDisplay.svelte';
  import { toggleLike } from '$lib/api/loadouts.js';
  import { getSkinsForWeapon } from '$lib/api/weapons.js';
  import { authStore, loadCurrentUser } from '$lib/stores/auth.svelte.js';
  import type { Skin, LoadoutSlot } from '@lb/shared';

  let { data } = $props();
  let selectedSkin = $state<Skin | null>(null);
  let wear = $state(0.15);
  let seed = $state(500);
  let liked = $state(false);
  let likesCount = $state(data.loadout.likesCount);

  $effect(() => { loadCurrentUser(); });

  async function selectSlot(slot: LoadoutSlot) {
    // Fetch the skin details for this slot and display in viewer
    const skins = await getSkinsForWeapon(slot.weaponDefIndex);
    const skin = skins.find(s => s.id === slot.skinId) ?? null;
    selectedSkin = skin;
    wear = slot.wear;
    seed = slot.seed;
  }

  async function handleLike() {
    const res = await toggleLike(data.loadout.id);
    liked = res.liked;
    likesCount += liked ? 1 : -1;
  }
</script>

<svelte:head>
  <title>{data.loadout.name} — CS2 Loadout Builder</title>
  <meta property="og:title" content={data.loadout.name} />
  <meta property="og:description" content="View this CS2 loadout" />
</svelte:head>

<div class="min-h-screen bg-gray-950 text-white">
  <header class="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
    <h1 class="text-xl font-semibold">{data.loadout.name}</h1>
    <div class="flex items-center gap-3">
      <button onclick={handleLike} class="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors">
        <span class={liked ? 'text-red-400' : ''}>❤</span>
        <span>{likesCount}</span>
      </button>
      {#if !authStore.user}
        <a href="{import.meta.env.VITE_API_URL}/auth/steam" class="text-sm text-blue-400 hover:text-blue-300">
          Login to save
        </a>
      {/if}
    </div>
  </header>

  <div class="flex h-[calc(100vh-65px)]">
    <aside class="w-64 border-r border-gray-800 overflow-y-auto p-3">
      <h2 class="text-xs text-gray-500 uppercase tracking-wide mb-3">Weapons</h2>
      {#each data.loadout.slots as slot}
        {@const weapon = Object.values(data.weapons).flat().find(w => w.defIndex === slot.weaponDefIndex)}
        <button
          class="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-sm text-gray-300 transition-colors
                 {selectedSkin?.id === slot.skinId ? 'bg-gray-800 text-white' : ''}"
          onclick={() => selectSlot(slot)}
        >
          {weapon?.name ?? `Weapon #${slot.weaponDefIndex}`}
        </button>
      {/each}
    </aside>

    <main class="flex-1 p-6">
      <WeaponScene skin={selectedSkin} {wear} {seed} />
      {#if selectedSkin}
        <div class="mt-4">
          <PriceDisplay skinId={selectedSkin.id} />
        </div>
      {/if}
    </main>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/share
git commit -m "feat(web): add public share page with like button"
```

---

## Task 9: Profile Page

**Files:**
- Modify: `apps/web/src/routes/u/[steamId]/+page.ts`
- Modify: `apps/web/src/routes/u/[steamId]/+page.svelte`

- [ ] **Step 1: Create +page.ts**

```typescript
import { getUserLoadouts } from '$lib/api/loadouts.js';

export async function load({ params }: { params: { steamId: string } }) {
  const loadouts = await getUserLoadouts(params.steamId).catch(() => []);
  return { steamId: params.steamId, loadouts };
}
```

- [ ] **Step 2: Create +page.svelte**

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Loadouts — CS2 Builder</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 text-white p-8 max-w-5xl mx-auto">
  <h1 class="text-2xl font-bold mb-6">Public Loadouts</h1>

  {#if data.loadouts.length === 0}
    <p class="text-gray-500">No public loadouts yet.</p>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {#each data.loadouts as loadout}
        <a
          href="/share/{loadout.shareSlug}"
          class="block bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors border border-gray-800 hover:border-gray-600"
        >
          <h2 class="font-semibold mb-1">{loadout.name}</h2>
          <p class="text-sm text-gray-400">{loadout.slots?.length ?? 0} weapons configured</p>
          <div class="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <span>❤ {loadout.likesCount}</span>
            <span class="ml-auto">{new Date(loadout.createdAt).toLocaleDateString()}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/u
git commit -m "feat(web): add public profile page with loadout grid"
```

---

## Task 10: Steam Inventory Import in Builder

**Files:**
- Modify: `apps/web/src/routes/builder/+page.svelte`

- [ ] **Step 1: Add inventory import button to builder**

Add to the header section of the builder page (after LoadoutHeader):

```svelte
<script lang="ts">
  // Add to existing imports:
  import { apiFetch } from '$lib/api/client.js';
  import type { InventoryItem } from '@lb/shared';

  let importingInventory = $state(false);

  async function importFromInventory() {
    importingInventory = true;
    try {
      const items = await apiFetch<InventoryItem[]>('/inventory');
      for (const item of items) {
        loadoutStore.setSlot({
          weaponDefIndex: item.weaponDefIndex,
          skinId: item.skinId,
          wear: item.wear,
          seed: item.seed,
          statTrak: item.statTrak,
        });
      }
    } catch (err) {
      console.error('Inventory import failed:', err);
    } finally {
      importingInventory = false;
    }
  }
</script>
```

Add import button in the header row:
```svelte
<button
  onclick={importFromInventory}
  disabled={importingInventory}
  class="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded transition-colors"
>
  {importingInventory ? 'Importing…' : 'Import from Steam'}
</button>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/builder/+page.svelte
git commit -m "feat(web): add Steam inventory import to builder"
```

---

## Task 11: Full E2E Tests

**Files:**
- Create: `e2e/builder.test.ts`
- Create: `e2e/share.test.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'pnpm --filter @lb/api dev', port: 3001, reuseExistingServer: true },
    { command: 'pnpm --filter @lb/web dev', port: 5173, reuseExistingServer: true },
  ],
});
```

- [ ] **Step 2: Create e2e/builder.test.ts**

```typescript
import { test, expect } from '@playwright/test';

test('landing page shows Steam login button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Login with Steam')).toBeVisible();
});

test('unauthenticated user is redirected from /builder to /', async ({ page }) => {
  await page.goto('/builder');
  await expect(page).toHaveURL('/');
});

test('share page is accessible without auth', async ({ page }) => {
  // This test needs a seeded loadout slug — skip in CI without DB
  test.skip(!process.env.TEST_SHARE_SLUG, 'No test share slug provided');
  await page.goto(`/share/${process.env.TEST_SHARE_SLUG}`);
  await expect(page.locator('h1')).toBeVisible();
});
```

- [ ] **Step 3: Run E2E tests**

```bash
pnpm exec playwright test
```
Expected: landing page test PASS, redirect test PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e playwright.config.ts
git commit -m "test(e2e): add Playwright tests for builder flow and share page"
```

---

## Task 12: Final Integration Check

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```
Expected: All unit + integration + component tests PASS.

- [ ] **Step 2: Build**

```bash
pnpm build
```
Expected: Both `apps/api` and `apps/web` build without errors.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```
Expected: No TypeScript errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: plan 3 complete — full builder UI with all features"
```

---

## Verification

1. Start both servers: `pnpm dev:api` + `pnpm dev:web`
2. Visit `http://localhost:5173` → landing with Steam login
3. Login with Steam → land on `/builder`
4. Click a weapon (e.g. AK-47) → skin catalogue opens
5. Select a skin → viewer shows 3D model with paintkit
6. Adjust wear slider → viewer updates in real-time
7. Change seed → pattern shifts
8. Click "Share" → toggle public → copy URL
9. Open URL in incognito → loadout visible, like button works
10. Visit `/u/{steamId}` → public loadouts grid
11. Click "Import from Steam" → slots pre-filled from inventory
