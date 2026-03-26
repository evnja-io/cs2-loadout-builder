# CS2 Loadout Builder — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Stack:** SvelteKit (SPA) + Threlte + Tailwind / Fastify + PostgreSQL + Drizzle

---

## Context

A standalone web app allowing CS2 players to compose, visualize, save, and share their skin loadouts. The centerpiece is a high-fidelity 3D weapon viewer with a paintkit-accurate GLSL shader renderer (pattern, wear, finish style) — comparable to csgoskins.gg. Players log in via Steam, can import their real CS2 inventory, browse the skin catalogue, and share loadouts with a public link. Price data from Steam Market, CSFloat, and Bitskin is displayed per skin.

---

## Architecture

### Monorepo Structure

```
loadout-builder/
├── apps/
│   ├── web/                    # SvelteKit adapter-static (SPA, no SSR)
│   │   ├── src/
│   │   │   ├── routes/         # /, /builder, /u/[steam], /share/[slug]
│   │   │   ├── lib/
│   │   │   │   ├── components/ # UI components
│   │   │   │   ├── viewer/     # Threlte scenes + GLSL shaders
│   │   │   │   ├── stores/     # Svelte 5 runes ($state, $derived)
│   │   │   │   └── api/        # Typed fetch wrappers (shared types)
│   │   │   └── app.html
│   │   └── vite.config.ts
│   │
│   └── api/                    # Fastify v5
│       ├── src/
│       │   ├── routes/         # REST endpoints
│       │   ├── db/             # Drizzle schema + migrations
│       │   ├── services/       # steam, csfloat, bitskin, prices
│       │   └── plugins/        # auth, cors, rate-limit
│       └── drizzle.config.ts
│
├── packages/
│   └── shared/                 # Zod schemas + inferred TS types
│
└── scripts/
    └── extract-assets/         # Offline pipeline: CS2 VPK → .glb + .webp
```

**Key decisions:**
- SvelteKit `adapter-static` = SPA mode, no SSR — avoids all WebGL/Threlte hydration issues
- Fastify on a separate port; frontend communicates via typed REST API
- `packages/shared` owns all domain types (`Weapon`, `Skin`, `Loadout`, `PaintKit`, `PriceData`) defined as Zod schemas — inferred TypeScript types used everywhere
- pnpm workspaces for dependency management

---

## Database Schema (Drizzle + PostgreSQL)

```typescript
users          { steamId (PK), username, avatar, profileUrl, createdAt }

loadouts       { id (uuid), userId, name, isPublic, shareSlug (unique, nanoid-8),
                 likesCount, createdAt, updatedAt }

loadout_slots  { id (uuid), loadoutId (uuid, FK loadouts.id), weaponDefIndex (int),
                 skinId (int, FK skins.id), wear (float4), seed (int), statTrak (bool) }
                 -- UNIQUE(loadoutId, weaponDefIndex): one skin per weapon per loadout

loadout_likes  { userId, loadoutId, createdAt }  -- composite PK

weapons        { defIndex (PK), name, category, modelPath, iconPath }

skins          { id (int, PK, auto-increment), weaponDefIndex, paintKitId, name, rarity,
                 finishStyle, patternTexture, colorTexture, normalTexture, roughnessTexture,
                 wearMin, wearMax }
                 -- grunge texture is a shared global wear mask (one per weapon,
                 -- not per skin): /assets/weapons/{defIndex}/grunge.webp

price_cache    { skinId, source (steam|csfloat|bitskin), price, currency,
                 listingUrl, updatedAt }  -- TTL 15min, refreshed on-demand
```

**Notes:**
- `weaponDefIndex` = CS2 native identifier (AK-47 = 7) — stable source of truth
- `paintKitId` = CS2 paintkit ID, maps directly to extracted texture paths
- `shareSlug` = nanoid 8 chars (e.g. `xK3pQ7mR`); on collision (negligible probability), retry generation up to 3 times before returning 500
- `price_cache` prevents flooding third-party APIs; TTL enforced at query time

---

## 3D Viewer & Paintkit Renderer

### Asset Pipeline (offline, one-shot script)

```
CS2 VPK files
  → SourceIO (Blender addon): .mdl → .glb
  → VTFEdit / vtf2img: .vtf textures → .webp (max 1024×1024)
  → Node.js cataloguer: generates weapons.json + skins.json from items_game.txt
  → Output: /public/assets/{defIndex}/{paintKitId}/{texture}.webp
```

Extracted assets are **not committed to the repo**. For local development, `scripts/extract-assets` includes a `--sample` flag that extracts a minimal set (~5 weapons, ~10 skins) as mock assets. CI uses this sample set for frontend/viewer tests. — they are hosted on a static file server / object storage (e.g. S3-compatible). The `scripts/extract-assets` pipeline outputs to a configurable `ASSETS_OUTPUT_PATH` env var. The web app reads assets from `VITE_ASSETS_BASE_URL`. This keeps repo size manageable and allows re-running the pipeline on CS2 updates independently of deployments.

### Threlte Scene

```svelte
<Canvas>
  <T.PerspectiveCamera makeDefault position={[0, 0, 2.5]} />
  <OrbitControls enablePan={false} minDistance={1} maxDistance={5} />
  <Environment preset="studio" />
  <WeaponMesh
    glbPath="/assets/weapons/{defIndex}/model.glb"
    paintKitId={skin.paintKitId}
    wear={wear}           <!-- 0.0 FN → 1.0 BS -->
    seed={seed}           <!-- 0–1000 -->
    finishStyle={skin.finishStyle}
  />
</Canvas>
```

### Paintkit GLSL Shader (MeshStandardMaterial + onBeforeCompile)

Five textures + three uniforms per skin:

```glsl
uniform sampler2D tPattern;     // pattern/detail texture (UV-tiled)
uniform sampler2D tColor;       // base color / finish color map
uniform sampler2D tNormal;      // normal map
uniform sampler2D tRoughness;   // roughness + metalness map
uniform sampler2D tGrunge;      // wear/scratch mask (blended by uWear)
uniform float     uWear;        // 0.0 (FN) → 1.0 (BS)
uniform float     uSeed;        // normalized: (seed - 1) / 999.0 → [0.0, 1.0] (seed range: 1–1000)
                                // UV offset: vec2(fract(uSeed * 0.37), fract(uSeed * 0.51))
uniform int       uFinishStyle; // enum: Solid=0, Hydro=1, Anodized=2, Gunsmith=3, ...

// Fragment logic:
// 1. Compute pattern UV = baseUV + offset(uSeed)
// 2. Sample tPattern → modulate with tColor → apply finish-specific tint
// 3. Sample tNormal → feed into Three.js normal slot
// 4. Sample tRoughness → feed into roughness/metalness PBR slots
// 5. Sample tGrunge → blend scratches onto albedo + roughness by uWear
```

**Supported finish styles:** Solid Color, Hydrographic, Spray-Paint, Anodized, Anodized Multicolored, Gunsmith, Custom Paint Job.

**Performance:**
- WebP textures, max 1024×1024
- `THREE.TextureLoader` with LRU cache (16 textures default, configurable via `VITE_TEXTURE_CACHE_SIZE`)
- Mobile fallback: simplified shader (no grunge) + Steam CDN image

---

## API Routes (Fastify v5)

### Auth — Steam OpenID 2.0

```
GET  /auth/steam           → redirect to Steam OpenID
GET  /auth/steam/callback  → validate, sign JWT, redirect to /builder
GET  /auth/me              → current user profile (JWT required)
POST /auth/logout          → clear cookie
```

JWT stored as `httpOnly; SameSite=Strict` cookie. Expiry: 7 days. No refresh mechanism in v1 — user re-authenticates via Steam on expiry.

### Loadouts

```
GET    /loadouts              → user's loadouts (auth)
POST   /loadouts              → create loadout (auth)
GET    /loadouts/:id          → detail (own or public)
PATCH  /loadouts/:id          → rename, toggle public (auth + owner)
DELETE /loadouts/:id          → delete (auth + owner)
PUT    /loadouts/:id/slots    → bulk-update all slots (auth + owner)
GET    /share/:slug           → public loadout by slug
POST   /loadouts/:id/like     → toggle like (auth)
```

### Catalogue & Inventory

```
GET /weapons                                          → all weapons by category
GET /weapons/:defIndex/skins?rarity=&collection=&maxPrice=  → skins for a weapon (client-side filtering for <200 results; query params for larger sets)
GET /users/:steamId/loadouts                          → public loadouts for a user profile
GET /inventory                                        → user's CS2 Steam inventory (proxy + cache, TTL 5min)
                                                        Response: InventoryItem[]
                                                        InventoryItem { weaponDefIndex, skinId, wear, seed,
                                                          statTrak, iconUrl, marketHashName }
                                                        -- parsed from Steam API classinfo (defindex + paintindex
                                                        -- extracted from tags); items without a matching skin in
                                                        -- the DB are filtered out
GET /prices?skinId=&sources=steam,csfloat,bitskin     → aggregated prices (15min cache)
```

### Rate Limiting

- `/inventory`: max 1 req/30s per user (Steam API constraint)
- `/prices`: max 10 req/min per IP
- CORS: whitelist frontend domain only

---

## Frontend — Key Pages & Components

### Routes

| Path | Description |
|------|-------------|
| `/` | Landing — hero, featured loadouts, Steam login CTA |
| `/builder` | Main loadout builder (auth required — enforced by a SvelteKit client-side route guard in `+layout.ts`; unauthenticated users are redirected to `/` before any UI renders) |
| `/u/[steamId]` | Public profile — user's public loadouts (routed by steamId for stability; display name shown in UI) |
| `/share/[slug]` | Read-only shared loadout with 3D viewer — publicly accessible without authentication |

### Builder Layout (Option A — Sidebar + Centered Viewer)

```
┌────────────────────────────────────────────────┐
│  [Logo]  [My Loadouts ▾]  [Loadout Name]  [Share] [Avatar] │
├───────────────┬────────────────────────────────┤
│  SIDEBAR      │  3D VIEWER                     │
│               │                                │
│  [Équipement] │  ┌──────────────────────┐      │
│  [Pistolets]  │  │   WeaponMesh (Threlte)│      │
│  [Milieu]     │  │                      │      │
│  [Fusils]     │  └──────────────────────┘      │
│  [Couteaux]   │                                │
│               │  [Skin Name]  Rarity  Finish   │
│  ─── Grid ─── │  Wear ────────●──────────       │
│  [AK][M4][AWP]│  Seed  [1234]  StatTrak [off]  │
│  [USP][Glock] │                                │
│  [Knife][Glv] │  Steam: $45  CSFloat: $42  BS: $43 │
│               │                                │
└───────────────┴────────────────────────────────┘
```

- Sidebar: CS2-style category tabs + weapon icon grid
- Skin selection: search bar + filterable catalogue (rarity, collection, price range)
- Viewer controls: wear slider, seed input, StatTrak toggle
- Price display: per-source with external link

---

## Testing Strategy (TDD)

```
apps/api/tests/
  unit/         # services: steamService, priceService, inventoryService
  integration/  # all routes via fastify.inject() + test Postgres (@testcontainers)

apps/web/tests/
  unit/         # stores, paintkit utils, slug generation
  components/   # Svelte Testing Library + Vitest

e2e/            # Playwright: builder flow, share page, Steam auth (mocked)
```

**TDD rules:**
- Integration test written before each route implementation
- All external APIs (Steam, CSFloat, Bitskin) mocked via `vi.mock` / MSW
- GLSL shader tested via headless Three.js snapshots (`canvas` npm package)
- Zod schemas tested exhaustively (valid + invalid cases) in `packages/shared`

**CI pipeline:**
```
lint → typecheck → test:unit → test:integration → test:e2e → build
```

Tools: Vitest, Playwright, Svelte Testing Library, @testcontainers/postgresql, MSW.

---

## Key Technical Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| CS2 asset extraction complexity | Use community-validated tools (SourceIO + VTFEdit); document the pipeline step-by-step |
| Paintkit shader accuracy | Start with Hydrographic/Solid (simplest), iterate to Gunsmith/Anodized |
| Steam API rate limits | Per-user cache on `/inventory`, exponential backoff |
| WebGL on mobile | Shader LOD system: full shader desktop, simplified mobile, CDN image fallback |
| CS2 game updates changing VPK structure | Pin asset extraction to a specific game version; re-run pipeline on updates |
| Missing skin asset after CS2 update | Fallback chain: extracted asset → Steam CDN image URL → placeholder SVG |
| Price refresh latency | `/prices` uses stale-while-revalidate: serve cached price immediately, refresh in background if TTL expired |

---

## Out of Scope (v1)

- Sticker placement / sticker viewer
- Agent / music kit / spray slots
- Price alerts or purchase flow
- Real-time collaboration on loadouts
- Mobile-native app
